const crypto = require("crypto");
const { sequelize, Op, models } = require("../../../config/sequelize.config");
const { Book, User, OrderRequest, Quote, Payment } = models; // Destructures the User model from Sequelize's models
const {
  sendSellerOrderNotification,
  sendBuyerOrderNotification,
  sendQuoteAcceptedNotification,
  sendQuoteRejectedNotification,
  sendQuoteRevisionRequestNotification,
  sendOrderCancellationRequestNotification,
  sendOrderDisputeRequestNotification,
  sendOrderPaymentReceivedNotification,
} = require("../../../services/email");


// Helper function to format address
function formatAddress(address, city, state, pincode) {
  if (!address || !city || !state || !pincode) {
    return null;
  }

  return `${address}, ${city}, ${state} - ${pincode}`;
}

exports.getBooks = async (req, res) => {
  try {
    const { publication } = req.query;
    if (!publication) {
      return res.status(400).json({ message: "Publication is required." });
    }

    // Fetch all NCERT books with sellerId
    const books = await Book.findAll({
      where: { publication: publication },
      // attributes: ["title", "author", "price", "sellerId"], // Fetch relevant details
    });

    if (!books.length) {
      return res.status(404).send("No NCERT books found");
    }

    // Since all books share the same sellerId, get it from the first book
    // const sellerId = books[0].sellerId;

    // Send JSON response instead of rendering a view
    res.json({
      books, // List of NCERT books
      // sellerId, // Single seller ID
    });
  } catch (error) {
    console.error("Error fetching NCERT books:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.createOrder = async (req, res) => {
  let transaction;

  try {
    // Start the transaction
    transaction = await sequelize.transaction();

    const { publication, books } = req.body;

    // Get user data from middleware (assuming auth middleware sets req.user)
    const buyerId = req.user.id;
    const { address, city, state, pincode } = req.user;

    // Validate required fields
    if (!Array.isArray(books) || books.length === 0) {
      return res
        .status(400)
        .json({ message: "Missing or invalid order details." });
    }

    // Format full address from user data
    const fullAddress = formatAddress(address, city, state, pincode);

    if (!fullAddress) {
      return res.status(400).json({
        message: "Complete shipping address is required in your profile.",
      });
    }

    // Find the seller based on publication with expanded attributes
    const seller = await User.findOne({
      where: { publication: publication, role: "seller", status: "active" },
      attributes: ["id", "email", "name", "phone", "publication"],
      transaction,
    });

    if (!seller) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ message: "Seller not found for the specified publication." });
    }

    // Get buyer details for email notification
    const buyer = await User.findOne({
      where: { id: buyerId },
      attributes: ["name", "email", "phone"],
      transaction,
    });

    if (!buyer) {
      await transaction.rollback();
      return res.status(404).json({ message: "Buyer information not found." });
    }

    // Set initial values for charges (will be updated by seller in quote)
    const deliveryCharges = 0;
    const handlingCharges = 0;

    // Price verification and recalculation for security
    const totalPrice = books.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Convert book array to required format with totals
    const processedBooks = books.map((book) => ({
      code: book.code,
      title: book.title,
      price: book.price,
      quantity: book.quantity,
      class: book.class || "other",
      subject: book.subject || "",
      total: book.price * book.quantity,
    }));

    // Create new order request with status pending
    const newOrder = await OrderRequest.create(
      {
        buyerId,
        sellerId: seller.id,
        publication,
        books: processedBooks,
        totalPrice,
        discountPercentage: 0, // Initialize discountPercentage as 0
        deliveryCharges,
        handlingCharges,
        status: "pending",
        shippingAddress: fullAddress,
        billingAddress: fullAddress,
        statusHistory: [], // Start with empty array, the hook will populate it
        message: req.body.message || null,
        meta: {
          createdFrom: "web",
          userAgent: req.headers["user-agent"],
          ip: req.ip,
        },
      },
      {
        transaction,
        // Pass the custom options that the hook looks for
        userId: buyerId,
        statusNotes: "Order request created",
      }
    );

    // Commit the transaction
    await transaction.commit();

    // Send email notifications to seller and buyer
    try {
      // Get application config for email templates and company info
      // const appConfig = await AppConfig.findOne({ where: { active: true } });
      const companyName = process.env.COMPANY_NAME;
      const sellerDashboardUrl = process.env.SELLER_DASHBOARD_URL;
      const buyerDashboardUrl = process.env.BUYER_DASHBOARD_URL;
      const supportEmail = process.env.SUPPORT_EMAIL;

      // Common data for both emails
      const commonData = {
        orderNumber: newOrder.id,
        orderDate: new Date(newOrder.createdAt).toLocaleString(),
        orderStatus: newOrder.status.toUpperCase(),
        buyerMessage: newOrder.message,
        shippingAddress: newOrder.shippingAddress,
        books: processedBooks,
        subtotal: totalPrice,
        deliveryCharges: deliveryCharges,
        handlingCharges: handlingCharges,
        totalPrice: totalPrice + deliveryCharges + handlingCharges,
        companyName: companyName,
        currentYear: new Date().getFullYear(),
        supportEmail: supportEmail,
      };

      // 1. Prepare data for seller email template
      const sellerEmailData = {
        to: seller.email,
        subject: `New Order Request #${newOrder.id} - ${companyName}`,
        template: "seller-order-notification", // Name of your HBS template file
        data: {
          ...commonData,
          sellerName: seller.name,
          buyerName: buyer.name,
          dashboardLink: `${sellerDashboardUrl}`,
        },
      };

      // 2. Prepare data for buyer email template
      const buyerEmailData = {
        to: buyer.email,
        subject: `Order Confirmation #${newOrder.id} - ${companyName}`,
        template: "buyer-order-confirmation", // Name of your HBS template file
        data: {
          ...commonData,
          buyerName: buyer.name,
          sellerPublication: seller.publication,
          dashboardLink: `${buyerDashboardUrl}`,
        },
      };

      // Send both email notifications in parallel for better experience (Promise)
      sendSellerOrderNotification(sellerEmailData);
      sendBuyerOrderNotification(buyerEmailData);
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error("Failed to send order notification emails", emailError);
      // Consider implementing a retry mechanism or email queue here
    }

    // Return the created order
    res.status(201).json({
      success: true,
      message: "Order request submitted successfully",
      id: newOrder.id,
      status: newOrder.status,
      totalPrice: newOrder.totalPrice,
      timestamp: newOrder.createdAt,
    });
  } catch (error) {
    // Rollback the transaction in case of an error
    if (transaction) await transaction.rollback();

    console.error("Error while creating order request", error);

    // Specific error handling
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors.map((e) => ({
          field: e.path,
          message: e.message,
        })),
      });
    }

    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Helper function to get order details with associations
const getOrderWithDetails = async (orderId, userId) => {
  return await OrderRequest.findOne({
    where: {
      id: orderId,
      buyerId: userId,
    },
    include: [
      {
        model: Quote,
        as: "Quote",
      },
      {
        model: User,
        as: "seller",
        attributes: ["id", "name", "email", "phone", "businessName"],
      },
      {
        model: User,
        as: "buyer",
        attributes: ["id", "name", "email", "phone"],
      },
      {
        model: Payment,
        as: "Payments",
      },
    ],
  });
};

// Format order for client response
const formatOrderForClient = (order) => {
  // Helper function to safely handle JSON or already parsed data
  const ensureObject = (data) => {
    if (!data) return null;

    // If it's already an object or array, return as is
    if (typeof data !== "string") return data;

    // If it's a string, try to parse it
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error("Error parsing data:", e);
      return data; // Return original if can't parse
    }
  };

  // Transform the order into the format expected by the front-end
  const formatted = {
    id: order.id,
    createdAt: order.createdAt,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    sellerName: order.seller ? order.seller.name : "Unknown Seller",
    publication: order.publication,
    // No need to parse books, it's already an array
    books: order.books,
    totalPrice: parseFloat(order.totalPrice),
    discountPercentage: parseFloat(order.discountPercentage || 0), // Add discountPercentage field
    discountAmount:
      (parseFloat(order.totalPrice) *
        parseFloat(order.discountPercentage || 0)) /
      100,
    deliveryCharges: parseFloat(order.deliveryCharges),
    handlingCharges: parseFloat(order.handlingCharges || 0),
    status: order.status,
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    // Status history might need parsing if it's stored as a string
    statusHistory: ensureObject(order.statusHistory),
    message: order.message,
    carrier: order.carrier,
    trackingNumber: order.trackingNumber,
    estimatedDeliveryDate: order.estimatedDeliveryDate,
    actualDeliveryDate: order.actualDeliveryDate,
    invoiceUrl: order.invoiceUrl,
  };

  // Add quote if exists
  if (order.Quote) {
    // Calculate the discount amount based on quote's totalPrice and discountPercentage
    const quoteDiscountAmount =
      (parseFloat(order.Quote.totalPrice) *
        parseFloat(order.Quote.discountPercentage || 0)) /
      100;
    formatted.quote = {
      id: order.Quote.id,
      createdAt: order.Quote.createdAt,
      sellerId: order.Quote.sellerId,
      status: order.Quote.status,
      // No need to parse books, it's already an array
      books: order.Quote.books,
      totalPrice: parseFloat(order.Quote.totalPrice),
      discountPercentage: parseFloat(order.Quote.discountPercentage || 0), // Add discountPercentage
      discountAmount: quoteDiscountAmount, // Add calculated discount amount
      deliveryCharges: parseFloat(order.Quote.deliveryCharges),
      handlingCharges: parseFloat(order.Quote.handlingCharges || 0),
      paymentUrl: order.Quote.paymentUrl ? order.Quote.paymentUrl : null,
      message: order.Quote.message,
      expiryDate: order.Quote.expiryDate,
      revisionReason: order.Quote.revisionReason,
      // Revision history might need parsing if it's stored as a string
      revisionHistory: ensureObject(order.Quote.revisionHistory),
    };
  }

  // Add payment if exists
  if (order.Payments && order.Payments.length > 0) {
    // Get the most recent payment
    const latestPayment = order.Payments.reduce((latest, current) => {
      return new Date(current.createdAt) > new Date(latest.createdAt)
        ? current
        : latest;
    }, order.Payments[0]);

    formatted.payment = {
      id: latestPayment.id,
      status: latestPayment.status,
      paymentMethod: latestPayment.paymentMethod,
      amount: parseFloat(latestPayment.amount),
      transactionId: latestPayment.transactionId,
      paymentDate: latestPayment.paymentDate || latestPayment.createdAt,
      // Status history might need parsing if it's stored as a string
      statusHistory: ensureObject(latestPayment.statusHistory),
    };
  }

  return formatted;
};

// Get all orders for current user
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    // console.log(userId);

    const orders = await OrderRequest.findAll({
      where: { buyerId: userId },
      include: [
        {
          model: Quote,
          as: "Quote",
        },
        {
          model: User,
          as: "seller",
          attributes: ["id", "name", "email", "phone", "businessName"],
        },
        {
          model: Payment,
          as: "Payments",
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    // console.log(orders[0]);

    const formattedOrders = orders.map((order) => formatOrderForClient(order));

    res.status(200).json({
      success: true,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

// Filter orders
exports.filterOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, publication, dateFrom, dateTo } = req.query;

    // Build the where clause
    const whereClause = { buyerId: userId };

    if (status) {
      whereClause.status = status;
    }

    if (publication) {
      whereClause.publication = publication;
    }

    // Date range filters
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};

      if (dateFrom) {
        whereClause.createdAt[sequelize.Op.gte] = new Date(dateFrom);
      }

      if (dateTo) {
        // Add one day to include the end date
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        whereClause.createdAt[sequelize.Op.lt] = endDate;
      }
    }

    const orders = await OrderRequest.findAll({
      where: whereClause,
      include: [
        {
          model: Quote,
          as: "Quote",
        },
        {
          model: User,
          as: "seller",
          attributes: ["id", "name", "email", "phone", "businessName"],
        },
        {
          model: Payment,
          as: "Payments",
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const formattedOrders = orders.map((order) => formatOrderForClient(order));

    res.status(200).json({
      success: true,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("Error filtering orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to filter orders",
    });
  }
};

// Accept Quote
exports.acceptQuote = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    // Get order with quote and include buyer and seller information
    const order = await OrderRequest.findOne({
      where: { id: orderId, buyerId: userId },
      include: [
        {
          model: Quote,
        },
        {
          model: User,
          as: "buyer",
          attributes: ["id", "name", "email", "phone"],
        },
        {
          model: User,
          as: "seller",
          attributes: ["id", "name", "email", "phone", "publication"],
        },
      ],
      transaction,
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!order.Quote) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "No quote found for this order",
      });
    }

    // Update quote status
    await order.Quote.update({ status: "accepted" }, { transaction });

    // Update order status using the method defined in the model
    await order.updateStatus(
      "quote_accepted",
      userId,
      "Quote accepted by buyer",
      { transaction }
    );
    await order.updateStatus(
      "awaiting_payment",
      userId,
      "Waiting for payment",
      { transaction }
    );

    await transaction.commit();

    // Get updated order
    const updatedOrder = await getOrderWithDetails(orderId, userId);

    // Send email notification to seller about quote acceptance
    try {
      // Get application config for email templates and company info
      // const appConfig = await AppConfig.findOne({ where: { active: true } });
      const companyName = process.env.COMPANY_NAME;
      const sellerDashboardUrl = process.env.SELLER_DASHBOARD_URL;
      const buyerDashboardUrl = process.env.BUYER_DASHBOARD_URL;
      const supportEmail = process.env.SUPPORT_EMAIL;

      // Calculate discount amount based on percentage
      const subtotal = Number(order.Quote.totalPrice || order.totalPrice);
      const discountPercentage = Number(order.Quote.discountPercentage || 0);
      const discountAmount = (subtotal * discountPercentage) / 100;
      const deliveryCharges = Number(order.Quote.deliveryCharges || 0);
      const handlingCharges = Number(order.Quote.handlingCharges || 0);

      // Ensure finalTotal is a number and format it
      const finalTotal = Number(
        subtotal - discountAmount + deliveryCharges + handlingCharges
      );

      // Prepare email data
      const emailData = {
        to: order.seller.email,
        subject: `Quote Accepted for Order #${order.id} - ${companyName}`,
        template: "quote-accepted-notification",
        data: {
          sellerName: order.seller.name,
          buyerName: order.buyer.name,
          orderNumber: order.id,
          acceptedDate: new Date().toLocaleString(),
          orderStatus: "AWAITING PAYMENT",
          shippingAddress: order.shippingAddress,
          // Use books from the quote instead of books from the order
          books: order.Quote.books || [],
          subtotal: subtotal.toFixed(2),
          discountPercentage: discountPercentage,
          discountAmount: discountAmount.toFixed(2),
          deliveryCharges: deliveryCharges.toFixed(2),
          handlingCharges: handlingCharges.toFixed(2),
          finalTotal: finalTotal.toFixed(2), // Format final total properly
          dashboardLink: `${sellerDashboardUrl}`,
          companyName: companyName,
          currentYear: new Date().getFullYear(),
          supportEmail: supportEmail,
        },
      };

      // Send the email notification asynchronously (don't await)
      sendQuoteAcceptedNotification(emailData).catch((err) => {
        console.error("Failed to send quote acceptance email to seller:", err);
      });
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error("Error preparing quote acceptance email:", emailError);
    }

    res.status(200).json({
      success: true,
      message: "Quote accepted successfully",
      order: formatOrderForClient(updatedOrder),
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error accepting quote:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept quote",
    });
  }
};

// Reject Quote
exports.rejectQuote = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    // Get order with quote and include buyer and seller information
    const order = await OrderRequest.findOne({
      where: { id: orderId, buyerId: userId },
      include: [
        {
          model: Quote,
        },
        {
          model: User,
          as: "buyer",
          attributes: ["id", "name", "email", "phone"],
        },
        {
          model: User,
          as: "seller",
          attributes: ["id", "name", "email", "phone", "publication"],
        },
      ],
      transaction,
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!order.Quote) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "No quote found for this order",
      });
    }

    // Update quote status
    await order.Quote.update({ status: "rejected" }, { transaction });

    // Update order status
    await order.updateStatus(
      "quote_rejected",
      userId,
      `Quote rejected by buyer - ${reason}`,
      { transaction }
    );

    await transaction.commit();

    // Get updated order
    const updatedOrder = await getOrderWithDetails(orderId, userId);

    // Send email notification to seller about quote rejection
    try {
      // Get application config for email templates and company info
      const companyName = process.env.COMPANY_NAME;
      const sellerDashboardUrl = process.env.SELLER_DASHBOARD_URL;
      const buyerDashboardUrl = process.env.BUYER_DASHBOARD_URL;
      const supportEmail = process.env.SUPPORT_EMAIL;

      // Calculate quote details (similar to the accept quote)
      const subtotal = Number(order.Quote.totalPrice || order.totalPrice);
      const discountPercentage = Number(order.Quote.discountPercentage || 0);
      const discountAmount = (subtotal * discountPercentage) / 100;
      const deliveryCharges = Number(order.Quote.deliveryCharges || 0);
      const handlingCharges = Number(order.Quote.handlingCharges || 0);
      const finalTotal = Number(
        subtotal - discountAmount + deliveryCharges + handlingCharges
      );

      // Prepare email data
      const emailData = {
        to: order.seller.email,
        subject: `Quote Rejected for Order #${order.id} - ${companyName}`,
        template: "quote-rejected-notification",
        data: {
          sellerName: order.seller.name,
          buyerName: order.buyer.name,
          orderNumber: order.id,
          rejectionDate: new Date().toLocaleString(),
          rejectionReason: reason,
          orderStatus: "QUOTE REJECTED",
          shippingAddress: order.shippingAddress,
          books: order.Quote.books || [],
          subtotal: subtotal.toFixed(2),
          discountPercentage: discountPercentage,
          discountAmount: discountAmount.toFixed(2),
          deliveryCharges: deliveryCharges.toFixed(2),
          handlingCharges: handlingCharges.toFixed(2),
          finalTotal: finalTotal.toFixed(2),
          dashboardLink: `${sellerDashboardUrl}`,
          companyName: companyName,
          currentYear: new Date().getFullYear(),
          supportEmail: supportEmail,
        },
      };

      // Send the email notification asynchronously (don't await)
      sendQuoteRejectedNotification(emailData).catch((err) => {
        console.error("Failed to send quote rejection email to seller:", err);
      });
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error("Error preparing quote rejection email:", emailError);
    }

    res.status(200).json({
      success: true,
      message: "Quote rejected successfully",
      order: formatOrderForClient(updatedOrder),
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error rejecting quote:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject quote",
    });
  }
};

// Process Payment
exports.processPayment = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { paymentMethod, quoteId, amount } = req.body;

    if (!paymentMethod || !quoteId || !amount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Payment method, quote ID, and amount are required",
      });
    }

    // Get order with quote
    const order = await getOrderWithDetails(orderId, userId);

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!order.Quote || order.Quote.id !== quoteId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid quote for this order",
      });
    }

    // Generate transaction ID based on payment method
    const transactionId = `${paymentMethod.toUpperCase()}${Date.now()
      .toString()
      .substring(7)}`;

    // Create payment record
    const payment = await Payment.create(
      {
        // id: uuid.v4(),
        quoteId: quoteId,
        orderRequestId: orderId,
        amount: amount,
        status: "completed",
        paymentMethod: paymentMethod,
        transactionId: transactionId,
        paymentDate: new Date(),
        statusHistory: [
          {
            status: "pending",
            timestamp: new Date(Date.now() - 5000),
            notes: "Payment initiated",
            userId: userId,
          },
          {
            status: "processing",
            timestamp: new Date(Date.now() - 3000),
            notes: "Processing payment",
            userId: "system",
          },
          {
            status: "completed",
            timestamp: new Date(),
            notes: "Payment completed",
            userId: "system",
          },
        ],
        createdBy: userId,
      },
      { transaction }
    );

    // Update order status
    await order.updateStatus("payment_completed", userId, "Payment received", {
      transaction,
    });

    await transaction.commit();

    // Get updated order
    const updatedOrder = await getOrderWithDetails(orderId, userId);

    res.status(200).json({
      success: true,
      message: "Payment processed successfully",
      order: formatOrderForClient(updatedOrder),
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error processing payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process payment",
    });
  }
};

// Request Quote Revision
exports.requestRevision = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Revision reason is required",
      });
    }

    const order = await getOrderWithDetails(orderId, userId);

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!order.Quote) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "No quote found for this order",
      });
    }

    // Update quote
    await order.Quote.update(
      {
        status: "pending_revision",
        revisionReason: reason,
      },
      { transaction }
    );

    const statusNote = `Revision requested: ${reason}`;
    await order.addStatusHistoryEntry(order.status, statusNote, userId, {
      transaction,
    });

    await transaction.commit();

    const updatedOrder = await getOrderWithDetails(orderId, userId);

    // Email notification (inline)
    try {
      const companyName = process.env.COMPANY_NAME;
      const sellerDashboardUrl = process.env.SELLER_DASHBOARD_URL;
      const buyerDashboardUrl = process.env.BUYER_DASHBOARD_URL;
      const supportEmail = process.env.SUPPORT_EMAIL;
      const quote = updatedOrder.Quote;

      const subtotal = Number(quote.totalPrice || updatedOrder.totalPrice);
      const discountPercentage = Number(quote.discountPercentage || 0);
      const discountAmount = (subtotal * discountPercentage) / 100;
      const deliveryCharges = Number(quote.deliveryCharges || 0);
      const handlingCharges = Number(quote.handlingCharges || 0);
      const finalTotal = Number(
        subtotal - discountAmount + deliveryCharges + handlingCharges
      );

      const emailData = {
        to: updatedOrder.seller.email,
        subject: `Revision Requested for Order #${updatedOrder.id} - ${companyName}`,
        template: "quote-revision-requested-notification",
        data: {
          sellerName: updatedOrder.seller.name,
          buyerName: updatedOrder.buyer.name,
          orderNumber: updatedOrder.id,
          revisionDate: new Date().toLocaleString(),
          revisionReason: reason,
          orderStatus: "PENDING REVISION",
          shippingAddress: updatedOrder.shippingAddress,
          books: quote.books || [],
          subtotal: subtotal.toFixed(2),
          discountPercentage,
          discountAmount: discountAmount.toFixed(2),
          deliveryCharges: deliveryCharges.toFixed(2),
          handlingCharges: handlingCharges.toFixed(2),
          finalTotal: finalTotal.toFixed(2),
          dashboardLink: sellerDashboardUrl,
          companyName,
          currentYear: new Date().getFullYear(),
          supportEmail,
        },
      };

      sendQuoteRevisionRequestNotification(emailData);
    } catch (emailError) {
      console.error("Error sending revision request email:", emailError);
      // Don't block response if email fails
    }

    res.status(200).json({
      success: true,
      message: "Revision requested successfully",
      order: formatOrderForClient(updatedOrder),
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error requesting revision:", error);
    res.status(500).json({
      success: false,
      message: "Failed to request revision",
    });
  }
};

// Cancel Order
exports.cancelOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { reason, notes } = req.body;

    if (!reason) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Cancellation reason is required",
      });
    }

    // Get order
    const order = await getOrderWithDetails(orderId, userId);

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order can be cancelled by buyer
    const cancellableStatuses = [
      "pending",
      "quoted",
      "quote_revised",
      "quote_accepted",
      "awaiting_payment",
      "payment_failed",
    ];

    if (!cancellableStatuses.includes(order.status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "This order cannot be cancelled at its current stage",
      });
    }

    // Update order status
    const cancellationNote = `Order cancelled by buyer. Reason: ${reason}${
      notes ? `. Notes: ${notes}` : ""
    }`;
    await order.updateStatus("cancelled", userId, cancellationNote, {
      transaction,
    });

    // Update quote status if exists
    if (order.Quote) {
      await order.Quote.update({ status: "cancelled" }, { transaction });
    }

    // Add cancellation info
    await order.update(
      {
        cancellationReason: reason,
        cancellationNotes: notes,
        cancelledAt: new Date(),
      },
      { transaction }
    );

    await transaction.commit();

    // Get updated order
    const updatedOrder = await getOrderWithDetails(orderId, userId);

    try {
      const companyName = process.env.COMPANY_NAME;
      const sellerDashboardUrl = process.env.SELLER_DASHBOARD_URL;
      const buyerDashboardUrl = process.env.BUYER_DASHBOARD_URL;
      const supportEmail = process.env.SUPPORT_EMAIL;
      const quote = updatedOrder.Quote;

      const emailData = {
        to: updatedOrder.seller.email,
        subject: `Order #${updatedOrder.id} Cancelled by Buyer - ${companyName}`,
        template: "order-cancelled-notification",
        data: {
          sellerName: updatedOrder.seller.name,
          buyerName: updatedOrder.buyer.name,
          orderNumber: updatedOrder.id,
          cancelledAt: new Date(updatedOrder.cancelledAt).toLocaleString(),
          cancellationReason: updatedOrder.cancellationReason,
          cancellationNotes: updatedOrder.cancellationNotes || "",
          shippingAddress: updatedOrder.shippingAddress,
          books: quote?.books || [],
          dashboardLink: sellerDashboardUrl,
          companyName,
          currentYear: new Date().getFullYear(),
          supportEmail,
        },
      };

      sendOrderCancellationRequestNotification(emailData);
    } catch (emailErr) {
      console.error("Failed to send cancellation email to seller:", emailErr);
    }

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order: formatOrderForClient(updatedOrder),
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error cancelling order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
    });
  }
};

// Submit Dispute
exports.submitDispute = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { type, description } = req.body;

    if (!type || !description) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Dispute type and description are required",
      });
    }

    // Get order
    const order = await getOrderWithDetails(orderId, userId);

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if dispute can be raised
    const disputeStatuses = ["shipped", "delivered", "completed"];

    if (!disputeStatuses.includes(order.status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Issues can only be raised for shipped or delivered orders",
      });
    }

    // Update order status
    const disputeNote = `Issue reported by buyer. Type: ${type}. Description: ${description}`;
    await order.updateStatus("disputed", userId, disputeNote, { transaction });

    // Add dispute info
    await order.update(
      {
        disputeType: type,
        disputeDescription: description,
        disputeDate: new Date(),
      },
      { transaction }
    );

    await transaction.commit();

    // Get updated order
    const updatedOrder = await getOrderWithDetails(orderId, userId);

    try {
      const companyName = process.env.COMPANY_NAME;
      const sellerDashboardUrl = process.env.SELLER_DASHBOARD_URL;
      const buyerDashboardUrl = process.env.BUYER_DASHBOARD_URL;
      const supportEmail = process.env.SUPPORT_EMAIL;
      const quote = updatedOrder.Quote;

      const emailData = {
        to: updatedOrder.seller.email,
        subject: `Dispute Raised for Order #${updatedOrder.id} - ${companyName}`,
        template: "order-disputed-notification",
        data: {
          sellerName: updatedOrder.seller.name,
          buyerName: updatedOrder.buyer.name,
          orderNumber: updatedOrder.id,
          disputeType: updatedOrder.disputeType,
          disputeDescription: updatedOrder.disputeDescription,
          disputeDate: new Date(updatedOrder.disputeDate).toLocaleString(),
          shippingAddress: updatedOrder.shippingAddress,
          books: quote?.books || [],
          dashboardLink: sellerDashboardUrl,
          companyName,
          currentYear: new Date().getFullYear(),
          supportEmail,
        },
      };

      sendOrderDisputeRequestNotification(emailData);
    } catch (emailErr) {
      console.error("Failed to send dispute email to seller:", emailErr);
    }

    res.status(200).json({
      success: true,
      message: "Issue reported successfully",
      order: formatOrderForClient(updatedOrder),
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error submitting dispute:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit issue",
    });
  }
};

exports.handleRazorpayWebhook = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    const isBuffer = Buffer.isBuffer(req.body);
    console.log("Webhook body isBuffer:", isBuffer);

    const rawBodyBuffer = isBuffer
      ? req.body
      : Buffer.from(JSON.stringify(req.body));

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBodyBuffer)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.warn("❌ Invalid signature");
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = JSON.parse(rawBodyBuffer.toString());
    console.log("✅ Parsed webhook event:", event);

    if (event.event !== "payment_link.paid") {
      return res.status(200).json({ status: "ignored" });
    }

    const payment = event.payload.payment.entity;
    const notes = payment.notes;

    const quoteId = notes.quote_id;
    const orderId = notes.internal_order_id;
    const buyerId = notes.customer_id;

    if (!quoteId || !orderId) {
      return res
        .status(400)
        .json({ error: "Missing quote/order info in webhook notes" });
    }

    const order = await getOrderWithDetails(orderId, buyerId);

    if (!order || !order.Quote || order.Quote.id !== quoteId) {
      return res.status(404).json({ error: "Quote or Order not found" });
    }

    // Idempotency check
    const existingPayment = await Payment.findOne({
      where: { transactionId: payment.id },
    });

    if (existingPayment) {
      return res.status(200).json({ status: "already processed" });
    }

    const razorpayToInternalMethod = {
      card: "card",
      upi: "upi",
      netbanking: "bank_transfer",
      wallet: "wallet",
      emi: "emi",
      paylater: "paylater",
    };

    const internalMethod =
      razorpayToInternalMethod[payment.method] || "razorpay";
    // Create initial record with pending status
    const newPayment = await Payment.create(
      {
        quoteId,
        orderRequestId: orderId,
        amount: parseFloat(payment.amount) / 100, // paise to INR
        status: "pending",
        paymentMethod: internalMethod,
        transactionId: payment.id,
        paymentDate: new Date(payment.created_at * 1000),
        createdBy: process.env.SYSTEM_USER_ID,
      },
      { transaction }
    );

    // Use model method to transition to completed with history tracking
    await newPayment.updateStatus(
      "completed",
      "system",
      "Payment marked as completed via Razorpay webhook",
      { transaction }
    );


    // Update order status
    await order.updateStatus(
      "payment_completed",
      "system",
      "Payment received via Razorpay",
      { transaction }
    );

    await transaction.commit();

    try {
      const companyName = process.env.COMPANY_NAME;
      const sellerDashboardUrl = process.env.SELLER_DASHBOARD_URL;
      const supportEmail = process.env.SUPPORT_EMAIL;

      const emailData = {
        to: order.seller.email,
        subject: `Payment Received for Order #${order.id} - ${companyName}`,
        template: "order-payment-success", // You’ll need to create this template
        data: {
          sellerName: order.seller.name,
          buyerName: order.buyer.name,
          buyerEmail: order.buyer.email,
          orderNumber: order.id,
          quoteId: order.Quote.id,
          paymentAmount: (payment.amount / 100).toFixed(2),
          paymentMethod: payment.method,
          paymentDate: new Date(payment.created_at * 1000).toLocaleString(),
          books: order.Quote.books || [],
          dashboardLink: sellerDashboardUrl,
          companyName,
          currentYear: new Date().getFullYear(),
          supportEmail,
        },
      };

      sendOrderPaymentReceivedNotification(emailData);
    } catch (emailErr) {
      console.error(
        "Failed to send payment confirmation email to seller:",
        emailErr
      );
    }


    return res.status(200).json({ success: true });
  } catch (err) {
    await transaction.rollback();
    console.error("🔴 Webhook payment processing error:", err);
    return res
      .status(500)
      .json({ error: "Failed to process Razorpay payment" });
  }
};

// Search orders
// exports.searchOrders = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { term } = req.query;

//     if (!term) {
//       return res.status(400).json({
//         success: false,
//         message: 'Search term is required'
//       });
//     }

//     const searchTerm = `%${term}%`; // For partial matching

//     // Using Sequelize's literal to search in JSON data
//     const orders = await OrderRequest.findAll({
//       where: {
//         buyerId: userId,
//         [sequelize.Op.or]: [
//           { id: { [sequelize.Op.iLike]: searchTerm } },
//           { publication: { [sequelize.Op.iLike]: searchTerm } },
//           // Search in books JSON field
//           sequelize.literal(`books::text ILIKE '%${term}%'`)
//         ]
//       },
//       include: [
//         {
//           model: Quote,
//           as: 'Quote',
//         },
//         {
//           model: User,
//           as: 'seller',
//           attributes: ['id', 'name', 'email', 'phone', 'businessName'],
//         },
//         {
//           model: Payment,
//           as: 'Payments',
//         },
//       ],
//       order: [['createdAt', 'DESC']]
//     });

//     const formattedOrders = orders.map(order => formatOrderForClient(order));

//     res.status(200).json({
//       success: true,
//       orders: formattedOrders
//     });
//   } catch (error) {
//     console.error('Error searching orders:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to search orders'
//     });
//   }
// };

//scaled up for future but needs modification
// const { Op, fn, col, where, literal } = require("sequelize");

// exports.searchOrders = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { term } = req.query;

//     if (!term) {
//       return res.status(400).json({
//         success: false,
//         message: "Search term is required",
//       });
//     }

//     const searchTerm = `%${term.toLowerCase()}%`;

//     const orders = await OrderRequest.findAll({
//       where: {
//         buyerId: userId,
//         [Op.or]: [
//           where(fn("LOWER", col("OrderRequest.id")), {
//             [Op.like]: searchTerm,
//           }),
//           where(fn("LOWER", col("OrderRequest.publication")), {
//             [Op.like]: searchTerm,
//           }),
//           // Search inside JSON field using raw SQL (PostgreSQL-specific)
//           literal(`LOWER(books::text) ILIKE '${searchTerm}'`),
//         ],
//       },
//       include: [
//         {
//           model: Quote,
//           as: "Quote",
//         },
//         {
//           model: User,
//           as: "seller",
//           attributes: ["id", "name", "email", "phone", "businessName"],
//           where: {
//             [Op.or]: [
//               where(fn("LOWER", col("seller.name")), {
//                 [Op.like]: searchTerm,
//               }),
//               where(fn("LOWER", col("seller.businessName")), {
//                 [Op.like]: searchTerm,
//               }),
//             ],
//           },
//           required: false, // <- keep orders even if no seller match
//         },
//         {
//           model: Payment,
//           as: "Payments",
//         },
//       ],
//       order: [["createdAt", "DESC"]],
//     });

//     const formattedOrders = orders.map((order) => formatOrderForClient(order));

//     res.status(200).json({
//       success: true,
//       orders: formattedOrders,
//     });
//   } catch (error) {
//     console.error("Error searching orders:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to search orders",
//     });
//   }
// };

// Get orders by category/tab - will need in future may be
// exports.getOrdersByCategory = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { category } = req.params;

//     // Define status mappings based on UI tabs
//     const categoryStatusMap = {
//       all: [],
//       pending: ['pending'],
//       quoted: ['quoted', 'quote_revised'],
//       confirmed: ['quote_accepted', 'awaiting_payment', 'payment_failed', 'payment_completed', 'processed'],
//       shipped: ['shipped', 'delivered'],
//       completed: ['completed'],
//       cancelled: ['cancelled', 'cancelled_by_seller', 'disputed', 'quote_rejected'],
//     };

//     // Build where clause
//     const whereClause = { buyerId: userId };

//     // Add status filter if not 'all'
//     if (category !== 'all' && categoryStatusMap[category]) {
//       whereClause.status = {
//         [Op.in]: categoryStatusMap[category]
//       };
//     }

//     const orders = await OrderRequest.findAll({
//       where: whereClause,
//       include: [
//         {
//           model: Quote,
//           as: 'Quote',
//         },
//         {
//           model: User,
//           as: 'seller',
//           attributes: ['id', 'name', 'email', 'phone', 'businessName'],
//         },
//         {
//           model: Payment,
//           as: 'Payments',
//         },
//       ],
//       order: [['createdAt', 'DESC']]
//     });

//     const formattedOrders = orders.map(order => formatOrderForClient(order));

//     res.status(200).json({
//       success: true,
//       orders: formattedOrders
//     });
//   } catch (error) {
//     console.error('Error getting orders by category:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to get orders by category'
//     });
//   }
// };
