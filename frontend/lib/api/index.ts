export { apiClient, getErrorMessage } from "./client";
export { searchFlights } from "./flights";
export {
  createBooking,
  getBooking,
  lookupBooking,
  payBooking,
  downloadBookingDocument,
} from "./bookings";
export { getPaymentConfig } from "./payments";
export { listPackages, getPackage } from "./packages";
export { createEnquiry } from "./enquiries";
export {
  adminLogin,
  listAdminBookings,
  getAdminStats,
  confirmAdminBooking,
  listAdminPackages,
  createAdminPackage,
  updateAdminPackage,
  deleteAdminPackage,
  listAdminEnquiries,
  updateAdminEnquiryStatus,
} from "./admin";
