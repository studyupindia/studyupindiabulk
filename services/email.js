const nodemailer = require("nodemailer");
const EmailConfig = require("../config/constants/static");
const path = require("path");

// config of AWS SMTP using nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  secure: process.env.SMTP_SECURE === "true", // make sure it's a boolean
  port: parseInt(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ⏬ Use dynamic import for the ESM module
(async () => {
  const hbs = (await import("nodemailer-express-handlebars")).default;

  const transporterOption = {
    viewEngine: {
      extName: ".hbs",
      partialsDir: path.resolve(__dirname, "../config/templates"),
      layoutsDir: path.resolve(__dirname, "../config/templates"),
      defaultLayout: "",
    },
    viewPath: path.resolve(__dirname, "../config/templates"),
    extName: ".hbs",
  };

  transporter.use("compile", hbs(transporterOption));
})();

exports.sendSampleEmail = async ({ to, subject, msg }) => {
  try {
    const response = await transporter.sendMail({
      from: `"StudyUpIndia" <${process.env.SMTP_USER}>`,
      to,
      subject,
      template: "sample",
      context: { msg },
    });

    console.log("Sample email sent:", response.messageId);
    return response;
  } catch (err) {
    console.error("Failed to send sample email:", err);
    throw err;
  }
};

exports.sendSellerOrderNotification = async ({ to, subject, template, data, from }) => {
  try {
    const response = await transporter.sendMail({
      from: `"StudyUpIndia" <${process.env.SMTP_USER}>`,
      to,
      subject,
      template: template,
      context: data,
    });

    console.log(`Seller Order Notification sent to Seller : ${to}`, response.messageId);
    return response;
  } catch (err) {
    console.error("Failed to send sample email:", err);
    throw err;
  }
};

exports.sendBuyerOrderNotification = async ({ to, subject, template, data, from }) => {
  try {
    const response = await transporter.sendMail({
      from: `"StudyUpIndia" <${process.env.SMTP_USER}>`,
      to,
      subject,
      template: template,
      context: data,
    });

    console.log(`Buyer Order Notification sent to Buyer : ${to}`, response.messageId);
    return response;
  } catch (err) {
    console.error("Failed to send sample email:", err);
    throw err;
  }
};

exports.sendQuoteAcceptedNotification = async ({ to, subject, template, data, from }) => {
  try {
    const response = await transporter.sendMail({
      from: `"StudyUpIndia" <${process.env.SMTP_USER}>`,
      to,
      subject,
      template: template,
      context: data,
    });

    console.log(`Quote Accepted Notification sent to Seller: ${to}`, response.messageId);
    return response;
  } catch (err) {
    console.error("Failed to send sample email:", err);
    throw err;
  }
};

exports.sendQuoteRejectedNotification = async ({ to, subject, template, data, from }) => {
  try {
    const response = await transporter.sendMail({
      from: `"StudyUpIndia" <${process.env.SMTP_USER}>`,
      to,
      subject,
      template: template,
      context: data,
    });

    console.log(`Quote Rejected Notification sent to Seller : ${to}`, response.messageId);
    return response;
  } catch (err) {
    console.error("Failed to send sample email:", err);
    throw err;
  }
};

exports.sendQuoteRevisionRequestNotification = async ({ to, subject, template, data, from }) => {
  try {
    const response = await transporter.sendMail({
      from: `"StudyUpIndia" <${process.env.SMTP_USER}>`,
      to,
      subject,
      template: template,
      context: data,
    });

    console.log(`Quote Revision Request Notification sent to Seller: ${to}`, response.messageId);
    return response;
  } catch (err) {
    console.error("Failed to send sample email:", err);
    throw err;
  }
};

exports.sendOrderCancellationRequestNotification = async ({ to, subject, template, data, from }) => {
  try {
    const response = await transporter.sendMail({
      from: `"StudyUpIndia" <${process.env.SMTP_USER}>`,
      to,
      subject,
      template: template,
      context: data,
    });

    console.log(`Order Cancellation Request Notification sent to Seller: ${to}`, response.messageId);
    return response;
  } catch (err) {
    console.error("Failed to send sample email:", err);
    throw err;
  }
};

exports.sendOrderDisputeRequestNotification = async ({ to, subject, template, data, from }) => {
  try {
    const response = await transporter.sendMail({
      from: `"StudyUpIndia" <${process.env.SMTP_USER}>`,
      to,
      subject,
      template: template,
      context: data,
    });

    console.log(`Order Dispute Notification sent to Seller: ${to}`, response.messageId);
    return response;
  } catch (err) {
    console.error("Failed to send sample email:", err);
    throw err;
  }
};

exports.sendQuoteCreatedNotification = async ({ to, subject, template, data, from }) => {
  try {
    const response = await transporter.sendMail({
      from: `"StudyUpIndia" <${process.env.SMTP_USER}>`,
      to,
      subject,
      template: template,
      context: data,
    });

    console.log(`Quote Notification sent to Buyer: ${to}`, response.messageId);
    return response;
  } catch (err) {
    console.error("Failed to send sample email:", err);
    throw err;
  }
};

exports.sendOrderProcessedNotification = async ({ to, subject, template, data, from }) => {
  try {
    const response = await transporter.sendMail({
      from: `"StudyUpIndia" <${process.env.SMTP_USER}>`,
      to,
      subject,
      template: template,
      context: data,
    });

    console.log(`Order Processed Notification sent to Buyer : ${to}`, response.messageId);
    return response;
  } catch (err) {
    console.error("Failed to send sample email:", err);
    throw err;
  }
};

exports.sendOrderShippedNotification = async ({ to, subject, template, data, from }) => {
  try {
    const response = await transporter.sendMail({
      from: `"StudyUpIndia" <${process.env.SMTP_USER}>`,
      to,
      subject,
      template: template,
      context: data,
    });

    console.log(`Order Shipped Notification sent to Buyer: ${to}`, response.messageId);
    return response;
  } catch (err) {
    console.error("Failed to send sample email:", err);
    throw err;
  }
};

exports.sendOrderCompletedNotification = async ({ to, subject, template, data, from }) => {
  try {
    const response = await transporter.sendMail({
      from: `"StudyUpIndia" <${process.env.SMTP_USER}>`,
      to,
      subject,
      template: template,
      context: data,
    });

    console.log(`Order Completed Notification sent to Buyer : ${to}`, response.messageId);
    return response;
  } catch (err) {
    console.error("Failed to send sample email:", err);
    throw err;
  }
};

exports.sendOrderCancelledBySellerNotification = async ({ to, subject, template, data, from }) => {
  try {
    const response = await transporter.sendMail({
      from: `"StudyUpIndia" <${process.env.SMTP_USER}>`,
      to,
      subject,
      template: template,
      context: data,
    });

    console.log(`Order Cancelled by Seller Notification sent to Buyer : ${to}`, response.messageId);
    return response;
  } catch (err) {
    console.error("Failed to send sample email:", err);
    throw err;
  }
};

exports.sendOrderPaymentReceivedNotification = async ({ to, subject, template, data, from }) => {
  try {
    const response = await transporter.sendMail({
      from: `"StudyUpIndia" <${process.env.SMTP_USER}>`,
      to,
      subject,
      template: template,
      context: data,
    });

    console.log(`Order Payment recieved Notification sent to Seller : ${to}`, response.messageId);
    return response;
  } catch (err) {
    console.error("Failed to send sample email:", err);
    throw err;
  }
};


exports.sendResetPasswordEmail = async ({ to, name, resetLink }) => {
  try {
    const response = await transporter.sendMail({
      from: `"StudyUpIndia" <${process.env.SMTP_USER}>`,
      to,
      subject: "Reset Your Password - StudyUpIndia",
      template: "password-reset", // corresponds to password-reset.hbs
      context: { name, resetLink },
    });

    console.log(
      `Order Payment recieved Notification sent to Seller : ${to}`,
      response.messageId
    );
    return response;
  } catch (err) {
    console.error("Failed to send sample email:", err);
    throw err;
  }
};

