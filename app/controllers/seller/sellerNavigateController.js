exports.renderSellerDashboard = async (req, res) => {
  try {
    res.render("seller-dashboard", {});
  } catch (error) {
    console.log(error);
  }
};
