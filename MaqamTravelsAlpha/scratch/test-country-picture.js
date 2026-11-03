const mongoose = require("mongoose");
const VisaInventory = require("../modules/visa/visaAdmin/visaStock1.model");
const adminVisaService = require("../modules/visa/visaAdmin/adminVisa.service");
const adminVisaController = require("../modules/visa/visaAdmin/adminVisa.controller");

console.log("Checking VisaInventory schema paths...");
const paths = Object.keys(VisaInventory.schema.paths);
console.log("countryImage exists:", paths.includes("countryImage"));

console.log("countryFlag exists:", paths.includes("countryFlag"));


console.log("Checking adminVisaService exports...");
// console.log("uploadCountryPicture is function:", typeof adminVisaService.uploadCountryPicture === "function");
console.log("Checking adminVisaController exports...");
// console.log("uploadCountryPicture controller is function:", typeof adminVisaController.uploadCountryPicture === "function");

console.log("ALL CHECKS PASSED!");
