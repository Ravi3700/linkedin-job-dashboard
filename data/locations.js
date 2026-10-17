/* ==========================================================================
   data/locations.js — City → State mapping.
   Single source of truth for the state filter. Only cities that actually
   appear in a search somewhere in this dashboard are listed here.
   To add a new state/city: add one entry here — filters.js, open-all.js
   and tab-manager.js all consume this automatically, no other file needs
   to change.
   ========================================================================== */

const CITY_STATE={
  "Ahmedabad":"Gujarat","Vadodara":"Gujarat","Surat":"Gujarat","Gandhinagar":"Gujarat","Vapi":"Gujarat",
  "Mumbai":"Maharashtra","Pune":"Maharashtra","Andheri":"Maharashtra",
  "Delhi":"Delhi","Gurugram":"Haryana","Noida":"Uttar Pradesh","Jaipur":"Rajasthan","Indore":"Madhya Pradesh",
  "Bengaluru":"Karnataka","Hyderabad":"Telangana","Chennai":"Tamil Nadu","Kolkata":"West Bengal","Chandigarh":"Chandigarh"
};
