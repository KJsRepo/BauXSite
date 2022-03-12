const server = require('./bxs/controller')
const ln = require('./lntools')
const Transaction = require("./bxs/models/transaction")
const Invoice = require("./bxs/models/invoice")

var {app, express, mailer, controller} = server

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}


function getUnsettledInvoices(){
  return new Promise((resolve, reject) => {
    let abandonedDate = new Date(new Date().getTime() - (30*60) * 1000)
    Invoice.find({'paymentDate': {$eq: null}, 'creationDate': {$gt: abandonedDate }})
      .then ((invoices) => { resolve(invoices)})
      .catch ((err) => { reject('Could not retrieve invoices: ' + err)})
  })

}


function updateSettledInvoices() {

  return new Promise((resolve, reject) => {
    const mainLoop = async function () {
      let invoices = await getUnsettledInvoices()
      let invoiceCount = invoices.length
      if (invoiceCount == 0) {
        resolve()
      } else {
        console.log(`Found ${invoiceCount} invoices`);
      }

      // TODO:  Refactor this to process all invoices at the same time

      await asyncForEach(invoices, async (invoice) => {

        try {
          console.log(invoice);

          if (!invoice.invoice_hash) resolve();

          let lnInvoiceDetails = await ln.checkLNInvoice(invoice.invoice_hash)

          if (lnInvoiceDetails.settled) {
            let userId = lnInvoiceDetails.memo
            let amount = lnInvoiceDetails.value
            let userBalanceBefore = await ln.getUserBalanceById(userId)
            let modifyResult = await ln.modifyUserBalanceById(userId, amount)
            invoice.paymentDate = new Date
            let updatedInvoice = new Invoice(invoice)
            let saveResult = await updatedInvoice.save()
            let toUsername = await controller.getUsernameById(userId)
            let transactionResult = await  ln.addTransaction(invoice.paymentDate, 'LIGHTNING_NETWORK', toUsername, amount, 'DEPOSIT', invoice.invoice_hash)
          }
        }
        catch (err) {
          reject(err)
        }

      })

      resolve()

    }

    mainLoop()

  })
}


async function invoiceLoop () {
  await updateSettledInvoices()
  setTimeout(invoiceLoop, 1000)
}


invoiceLoop()
