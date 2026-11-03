const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const VisaGroup = require('../modules/visa/user/visaGroup.model');
const VisaApplication = require('../modules/visa/user/visaApplication.model');
const User = require('../modules/auth/auth.model');
const visaService = require('../modules/visa/user/visa.service');
const visaController = require('../modules/visa/user/visa.controller');

async function testSingleAndMultipleVisa() {
  console.log("==================================================");
  console.log("TESTING SINGLE & MULTIPLE VISA SUBMISSION");
  console.log("==================================================");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Database connected!");

  try {
    let testUser = await User.findOne({ phone: "+918888877777" });
    if (!testUser) {
      testUser = await User.create({
        firstName: "Test",
        lastName: "VisaUser",
        phone: "+918888877777",
        email: "test.visauser@example.com",
        password: "HashedPassword123",
        role: "customer",
      });
    }

    const createdGroupIds = [];

    // Test 1: Single Applicant with userDetails as Object
    console.log("\n1. Testing Single Applicant (userDetails as Object)...");
    let resData1 = null;
    const req1 = {
      user: { id: testUser._id },
      body: {
        destinationCountry: "Saudi Arabia",
        visaType: "Tourist 30 Days",
        userDetails: {
          namePrefix: "Mr",
          firstName: "Ahmed",
          lastName: "Hassan",
          passportNumber: "P12345678",
          dateOfBirth: "1992-04-10",
          nationality: "Indian",
          gender: "male",
          documents: {
            passportScan: "https://cloudinary.com/sample_passport.jpg",
            photo: "https://cloudinary.com/sample_photo.jpg",
          }
        }
      }
    };
    const res1 = {
      status: (code) => ({
        json: (data) => {
          resData1 = { code, data };
          return data;
        }
      })
    };

    await visaController.createApplication(req1, res1, (err) => { if (err) throw err; });
    console.log("✅ Single applicant result status:", resData1.code);
    console.log("   Message:", resData1.data.message);
    console.log("   VisaGroup ID:", resData1.data.data.group._id);
    console.log("   Total Applicants:", resData1.data.data.group.totalApplicants);
    console.log("   Applicant 1 Name:", resData1.data.data.applications[0].travelerDetails.namePrefix, resData1.data.data.applications[0].travelerDetails.firstName, resData1.data.data.applications[0].travelerDetails.lastName);
    console.log("   Passport Scan Doc:", resData1.data.data.applications[0].documents.passportScan);
    createdGroupIds.push(resData1.data.data.group._id);

    // Test 2: Multiple Applicants with userDetails as Array of Objects
    console.log("\n2. Testing Multiple Applicants (userDetails as Array of Objects)...");
    let resData2 = null;
    const req2 = {
      user: { id: testUser._id },
      body: {
        destinationCountry: "UAE",
        visaType: "Express Tourist Visa",
        userDetails: [
          {
            namePrefix: "Mr",
            firstName: "Rashid",
            lastName: "Khan",
            passportNumber: "U99887766",
            dateOfBirth: "1988-11-20",
            nationality: "Indian",
            gender: "male",
            documents: {
              passportScan: "https://cloudinary.com/sample_rashid_pass.jpg",
            }
          },
          {
            namePrefix: "Mrs",
            firstName: "Fatima",
            lastName: "Khan",
            passportNumber: "U55443322",
            dateOfBirth: "1991-07-15",
            nationality: "Indian",
            gender: "female",
            documents: {
              passportScan: "https://cloudinary.com/sample_fatima_pass.jpg",
            }
          }
        ]
      }
    };
    const res2 = {
      status: (code) => ({
        json: (data) => {
          resData2 = { code, data };
          return data;
        }
      })
    };

    await visaController.createApplication(req2, res2, (err) => { if (err) throw err; });
    console.log("✅ Multiple applicants result status:", resData2.code);
    console.log("   Message:", resData2.data.message);
    console.log("   VisaGroup ID:", resData2.data.data.group._id);
    console.log("   Total Applicants:", resData2.data.data.group.totalApplicants);
    console.log("   Applicant 1:", resData2.data.data.applications[0].travelerDetails.namePrefix, resData2.data.data.applications[0].travelerDetails.firstName, resData2.data.data.applications[0].travelerDetails.lastName);
    console.log("   Applicant 2:", resData2.data.data.applications[1].travelerDetails.namePrefix, resData2.data.data.applications[1].travelerDetails.firstName, resData2.data.data.applications[1].travelerDetails.lastName);
    createdGroupIds.push(resData2.data.data.group._id);

    // Clean up
    console.log("\n3. Cleaning up test data...");
    await VisaApplication.deleteMany({ groupId: { $in: createdGroupIds } });
    await VisaGroup.deleteMany({ _id: { $in: createdGroupIds } });
    await User.findByIdAndDelete(testUser._id);
    console.log("✅ Cleaned up successfully!");

    console.log("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉\n");
  } catch (err) {
    console.error("❌ Test error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from DB");
  }
}

testSingleAndMultipleVisa();
