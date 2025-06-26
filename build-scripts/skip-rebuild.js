exports.default = async function(context) {
  console.log('Skipping native module rebuild...');
  // Return false to skip the default rebuild
  return false;
};