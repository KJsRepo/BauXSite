const request = require('request')
const Buffer = require('buffer').Buffer
const fs = require('fs');
const Invoice = require('./bxs/models/invoice')
const User = require('./bxs/models/user')
const Transaction = require('./bxs/models/transaction')

const server = require('./bxs/controller.js')
var {app, express, mailer, controller} = server

const macaroon = fs.readFileSync(`./invoice.macaroon`).toString('hex')
const adminMacaroon = fs.readFileSync(`./admin.macaroon`).toString('hex')

class LightningController {

  createInvoice (amount, memo) {

    return new Promise((resolve, reject) => {

      if(isNaN(amount)
        || amount > 10000
        || amount < 10) {
        reject('Amount is not a valid number')
      }

      // First create an invoice in the database
      let invoiceData = {
        'creationDate': new Date(),
        'username': controller.userdata.username,
        'amount': amount,
        'invoice_hash': null,
        paymentDate: null
      }

      let invoice = new Invoice(invoiceData)

      invoice.save()
        .then ((saveResult) => {
          //  Send it to the LN node to create a real invoice
          let requestBody = {
            value: amount,
            memo: memo
          }

          let options = {
            url: 'https://10.10.20.246:8080/v1/invoices',
            rejectUnauthorized: false,
            json: true,
            headers: {
                'Grpc-Metadata-macaroon': macaroon,
            },
            form: JSON.stringify(requestBody)
          }

          request.post(options, (err, res, body) => {
            if(!err) {

              // If all works, then update the Invoice with the invoice hash
              invoice.invoice_hash = body.r_hash
              invoice.save()
                .then ((finalSaveRes) => {
                  resolve(body)
                })

            }
          })

        })
        .catch ((err) => {
          controller.logError(`${err}`)
          reject(err)
        })
      })

  }


  checkLNInvoice (r_hash) {

    return new Promise((resolve, reject) => {

      let requesthash = r_hash
      let bufferedHash = Buffer.from(requesthash, 'base64')

      let options = {
        url: `https://10.10.20.246:8080/v1/invoice/${bufferedHash.toString('hex')}`,
        rejectUnauthorized: false,
        json: true,
        headers: {
            'Grpc-Metadata-macaroon': macaroon,
        }
      }

      request.get(options, function(err, res, body) {
        if(!err) {
          resolve(body)
        } else {
          reject(err)
        }
      })
    })
  }


  decodeLNInvoice (r_hash) {

    return new Promise((resolve, reject) => {

      r_hash = r_hash.replace('lightning:', '')

      let options = {
        url: `https://10.10.20.246:8080/v1/payreq/${r_hash.toString('hex')}`,
        rejectUnauthorized: false,
        json: true,
        headers: {
            'Grpc-Metadata-macaroon': adminMacaroon,
        }
      }

      request.get(options, function(err, res, body) {
        if(!err) {
          resolve(body)
        } else {
          reject(err)
        }
      })
    })
  }


  checkHuddleInvoice (invoice_hash) {

    return new Promise ((resolve, reject) => {
      Invoice.findOne({'invoice_hash': {$eq: invoice_hash}})
        .then((invoice) => {
          if(!invoice) {
            reject(`Could not find invoice`)
          } else {

            if(invoice.paymentDate) {
              resolve(true)
            } else {
              resolve(false)
            }
          }
        })
      })
  }

  getUserBalanceById(userId) {
    return new Promise((resolve, reject) => {
      User.findById(userId)
        .then((user) => {
          if(user) {
            let balance = parseInt(user.balance)
            resolve(balance)
          } else {
            reject(`User cannot be found: ${userId}`)
          }
        })
        .catch((err) => {
          controller.logError(err)
          reject(err)
        })
    })

  }


  modifyUserBalanceById(userId, amount) {
    return new Promise((resolve, reject) => {
      User.findById(userId)
        .then((user) => {
          if(user) {
            user.balance = parseInt(user.balance) + parseInt(amount)
            user.save()
              .then((saveResult) => {
                resolve(true)
              })
              .catch((err) => {
                controller.logError('Could not save new balance: ' + err)
                reject(err)
              })
          } else {
            controller.logError(`Could not find user by ID to modify balance: User ID: ${userId} | Amount: ${amount}`)
          }
        })
        .catch((err) => {
          controller.logError(err)
          reject(err)
        })
      })
  }


  payLNInvoice(payment_request) {

    return new Promise ((resolve, reject) => {

      payment_request = payment_request.replace('lightning:', '')

      let requestBody = {
        payment_request: payment_request,
        timeout_seconds: 15,
        fee_limit_sat: 25
      }

      let options = {
        url: 'https://10.10.20.246:8080/v2/router/send',
        rejectUnauthorized: false,
        json: true,
        headers: {
            'Grpc-Metadata-macaroon': adminMacaroon,
        },
        form: JSON.stringify(requestBody)
      }

      let resultMsg
      let success = false

      request.post(options, (err, res, body) => {
        if(!err) {

          if (body.error !== undefined) {
            resultMsg = body.error.message
            success = false
          } else {
            let resPieces = body.toString().split('\n')
            let lastPiece = JSON.parse(resPieces[resPieces.length - 2])

            if(lastPiece.result.status == 'FAILED') {
              resultMsg = lastPiece.result.failure_reason
              success = false
            } else if(lastPiece.result.status == 'SUCCEEDED') {
              resultMsg = 'Success!'
              success = true
            } else {
              resultMsg = 'NOT SURE!'
              success = false
              console.log(lastPiece.result);

            }

          }

          if (!success) {
            let logStr = `REST call failed = ${resultMsg}`
            controller.logError(logStr + `| ${resultMsg}`)
            reject(logStr)
          } else {
            resolve(resultMsg)
          }


        } else {
          let logStr = `REST call failed = ${err}`
          controller.logError(logStr + `| ${err}`)
          reject(logStr)
        }

      })
    })
  }

  payLNInvoiceFromUser (payment_request, userId) {

    return new Promise((resolve, reject) => {

      const payProcess = async () => {
        try {
          let requestDetails = await this.decodeLNInvoice(payment_request)
          let userBalance = await this.getUserBalanceById(userId)
          let username = await controller.getUsernameById(userId)
          if (requestDetails.num_satoshis > userBalance) {
            throw('User does not have enough funds')
          } else {
            this.payLNInvoice(payment_request)
              .then((paymentResult) => {

                this.modifyUserBalanceById(userId, 0-requestDetails.num_satoshis)
                  .then((result) => {

                    this.addTransaction(new Date(), username, 'LIGHTNING_NETWORK', 0-requestDetails.num_satoshis, 'WITHDRAWAL', payment_request)
                      .then((transactionResult) => {
                        resolve({amount: requestDetails.num_satoshis})
                      })
                      .catch((err) => {
                        reject(err)
                      })

                  })
                  .catch((err) => {
                    reject(err)
                  })

              })
              .catch((err) =>{
                reject(err)
              })
          }
        }
        catch (err) {
          let logStr = `Could not pay invoice / update user = ${err}`
          controller.logError(logStr + `| ${err}`)
          reject(logStr)

        }
      }

      payProcess()

    })

  }


  addTransaction (transactionDate, fromUsername, toUsername, amount, description, ref_id) {

    return new Promise ((resolve, reject) => {
      let transactionDetails = {transactionDate, fromUsername, toUsername, amount, description, ref_id}

      let newTransaction = new Transaction(transactionDetails)
console.log('*********');
      newTransaction.save()
        .then((result) => {
          resolve(result)
        })
        .catch((err) => {
          let logStr = `Could not create transaction = ${newTransaction}`
          controller.logError(logStr + `| ${err}`)
          reject(logStr)
        })
    })

  }
}

var ln = new LightningController()

module.exports = ln
