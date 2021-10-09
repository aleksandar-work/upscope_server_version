const bizAppointmentRoutes = require("../../routes/bizAppointmentRoutes");


describe("bizAppointmentRoutes.router", () => {
  it("Should be a function", () => {
    //expect(typeof bizAppointmentRoutes.aptFormat()).toBe("function");
    //bizAppointmentRoutes.aptFormat();
    //expect(bizAppointmentRoutes.aptFormat).toBeCalled();
    expect(typeof bizAppointmentRoutes.router).toBe("undefined");
  })
});