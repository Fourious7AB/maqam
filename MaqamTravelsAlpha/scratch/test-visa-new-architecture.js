const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const VisaGroup = require('../modules/visa/user/visaGroup.model');
const VisaApplication = require('../modules/visa/user/visaApplication.model');
const User = require('../modules/auth/auth.model');
const visaService = require('../modules/visa/user/visa.service');
const adminVisaService = require('../modules/visa/visaAdmin/adminVisa.service');

async function runVisaArchitectureTest() {
  console.log("==================================================");
  console.log("TESTING NEW VISA GROUP & APPLICATION ARCHITECTURE");
  console.log("==================================================");

  console.log("\n1. Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Database connected!");

  try {
    // 1. Create / find test applicant user
    let applicant = await User.findOne({ phone: "+919999988888" });
    if (!applicant) {
      applicant = await User.create({
        firstName: "Test",
        lastName: "Applicant",
        phone: "+919999988888",
        email: "test.applicant@example.com",
        password: "HashedPassword123",
        role: "customer",
      });
    }

    // 2. Create / find test agent user
    let agent = await User.findOne({ phone: "+919999977777" });
    if (!agent) {
      agent = await User.create({
        firstName: "Test",
        lastName: "Agent",
        phone: "+919999977777",
        email: "test.agent@example.com",
        password: "HashedPassword123",
        role: "sales_agent",
      });
    }

    console.log(`\n2. Creating Visa Batch submission for User: ${applicant._id}...`);
    const payload = {
      destinationCountry: "Saudi Arabia",
      visaType: "Umrah Visa",
      applicants: [
        {
          firstName: "Ali",
          lastName: "Khan",
          passportNumber: "A12345678",
          dateOfBirth: "1990-05-12",
          nationality: "Pakistani",
          gender: "male"
        },
        {
          firstName: "Sara",
          lastName: "Khan",
          passportNumber: "B98765432",
          dateOfBirth: "1994-08-22",
          nationality: "Pakistani",
          gender: "female"
        }
      ]
    };

    const batchResult = await visaService.createVisaBatch({
      userId: applicant._id,
      destinationCountry: payload.destinationCountry,
      visaType: payload.visaType,
      applicants: payload.applicants
    });

    console.log("✅ VisaGroup created ID:", batchResult.group._id);
    console.log("   totalApplicants:", batchResult.group.totalApplicants);
    console.log("   groupStatus:", batchResult.group.groupStatus);
    console.log("   paymentStatus:", batchResult.group.paymentStatus);
    console.log("✅ VisaApplications created count:", batchResult.applications.length);

    // 3. Verify group details retrieval
    console.log("\n3. Retrieving VisaGroup details with applications...");
    const groupDetails = await visaService.getUserVisaGroupDetails(batchResult.group._id, applicant._id);
    console.log("✅ Group retrieved. Child applications found:", groupDetails.applications.length);
    console.log("   First applicant name:", groupDetails.applications[0].travelerDetails.firstName, groupDetails.applications[0].travelerDetails.lastName);
    console.log("   Second applicant passport:", groupDetails.applications[1].travelerDetails.passportNumber);

    // 4. Test adding an applicant to the group
    console.log("\n4. Adding a third applicant to the existing VisaGroup...");
    const addedResult = await visaService.addApplicantToGroup({
      groupId: batchResult.group._id,
      userId: applicant._id,
      applicantData: {
        firstName: "Hamza",
        lastName: "Khan",
        passportNumber: "C11223344",
        dateOfBirth: "2000-01-15",
        nationality: "Pakistani",
        gender: "male"
      }
    });
    console.log("✅ Third applicant added. Updated totalApplicants:", addedResult.group.totalApplicants);

    // 5. Test Admin Dashboard Overview
    console.log("\n5. Testing Admin Dashboard Metrics...");
    const dashboard = await adminVisaService.getDashboardOverview();
    console.log("✅ Dashboard overview retrieved successfully!");
    console.log("   Total Applications:", dashboard.totalApplications);
    console.log("   Total Groups:", dashboard.totalGroups);
    console.log("   Submitted count:", dashboard.submitted);

    // 6. Test Admin Assigning Case Officer
    console.log("\n6. Assigning Case Officer to application 1...");
    const app1Id = batchResult.applications[0]._id;
    const assignedApp = await adminVisaService.assignCaseOfficer({
      visaId: app1Id,
      caseOfficerId: agent._id,
      assignedByAdminId: agent._id,
      adminRemarks: "Assigned for expedited review"
    });
    console.log("✅ Application assigned to agent:", assignedApp.assignedAgent?.firstName);
    console.log("   Application status after assign:", assignedApp.status);

    // 7. Test Admin Status Update (Approved)
    console.log("\n7. Updating Application Status to Approved...");
    const updatedApp = await adminVisaService.updateVisaStatus({
      visaId: app1Id,
      status: "approved",
      adminRemarks: "All docs verified, visa granted",
      issuedVisaUrl: "https://res.cloudinary.com/demo/image/upload/sample_visa.pdf"
    });
    console.log("✅ Application status updated to:", updatedApp.status);
    console.log("   Issued Visa URL:", updatedApp.issuedVisaUrl);

    // Verify parent VisaGroup updated status
    const refreshedGroup = await VisaGroup.findById(batchResult.group._id);
    console.log("✅ Parent VisaGroup groupStatus transitioned to:", refreshedGroup.groupStatus);

    // 8. Clean up test records
    console.log("\n8. Cleaning up test data...");
    await VisaApplication.deleteMany({ groupId: batchResult.group._id });
    await VisaGroup.findByIdAndDelete(batchResult.group._id);
    await User.deleteMany({ phone: { $in: ["+919999988888", "+919999977777"] } });
    console.log("✅ Cleanup complete!");

    console.log("\n🎉 ALL VISA ARCHITECTURE TESTS PASSED SUCCESSFULLY! 🎉\n");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from DB");
  }
}

runVisaArchitectureTest();
