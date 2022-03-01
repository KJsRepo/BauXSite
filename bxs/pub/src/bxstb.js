
function checkPassword(form) {

  password1 = form.password.value;
  password2 = form.confirmpassword.value;

  if (password1 == '') {
    document.getElementById('errorp').innerHTML = '<font color="red">Please enter a password</font>'
    return false;
  } else if (password2 == '') {
    document.getElementById('errorp').innerHTML = '<font color="red">Please confirm your password</font>'
    return false;
  } else if (password1 != password2) {
    document.getElementById('errorp').innerHTML = '<font color="red">Passwords do not match, please try again...</font>'
    return false;
  } else if (password1.length < 8) {
    document.getElementById('errorp').innerHTML = '<font color="red">Password is too short</font>'
    return false;
  } else{
    return true;
  }
}
