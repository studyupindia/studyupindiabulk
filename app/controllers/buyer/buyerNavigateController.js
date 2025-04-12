const { sendSampleEmail } = require("../../../services/email");

exports.renderHome = async (req, res) => {
  try {
    res.render("home", {});
  } catch (error) {
    console.log(error);
  }
};

exports.renderContactUs = async (req, res) => {
  try {
    res.render("contact", {});
  } catch (error) {
    console.log(error);
  }
};

exports.renderPrivacyPolicy = async (req, res) => {
  try {
    res.render("privacy-policy", {});
  } catch (error) {
    console.log(error);
  }
};

exports.renderReturnRefundPolicy = async (req, res) => {
  try {
    res.render("return-and-refund", {});
  } catch (error) {
    console.log(error);
  }
};

exports.renderTermsAndConditions = async (req, res) => {
  try {
    res.render("terms-and-conditions", {});
  } catch (error) {
    console.log(error);
  }
};

exports.renderShippingPolicy = async (req, res) => {
  try {
    res.render("shipping-policy", {});
  } catch (error) {
    console.log(error);
  }
};

exports.renderNcert = async (req, res) => {
  try {
    res.render("book-view", {
      title: "NCERT Publication",
      cartKey: "NCERT_CART",
      cartPublication: "NCERT",
    });
  } catch (error) {
    console.log(error);
  }
};

exports.renderZee = async (req, res) => {
  try {
    res.render("book-view", {
      title: "ZEE Publication",
      cartKey: "ZEE_CART",
      cartPublication: "NCERT",
    });
  } catch (error) {
    console.log(error);
  }
};

exports.renderOrderHistory = async (req, res) => {
  try {
    res.render("order-history", {
      title: "ZEE Publication",
      cartKey: "ZEE_CART",
      cartPublication: "NCERT",
    });
  } catch (error) {
    console.log(error);
  }
};
