const { sequelize, Op, models } = require("../../../config/sequelize.config");
const { Book, User, OrderRequest, Quote, Payment } = models; // Destructures the User model from Sequelize's models
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { Upload } = require("@aws-sdk/lib-storage");
const Razorpay = require("razorpay");
const s3 = require("../../../utils/s3ClientUtil"); // Import the S3 client
const {
  sendQuoteCreatedNotification,
  sendOrderProcessedNotification,
  sendOrderShippedNotification,
  sendOrderCompletedNotification,
  sendOrderCancelledBySellerNotification,
} = require("../../../services/email");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Configure multer to use memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"), false);
  },
});

// Helper function to get order details with associations for seller
const getSellerOrderWithDetails = async (orderId, sellerId) => {
  return await OrderRequest.findOne({
    where: {
      id: orderId,
      sellerId: sellerId,
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

// Format order for client response - similar to buyer's but with more details
const formatOrderForSeller = (order) => {
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
    buyerName: order.buyer ? order.buyer.name : "Unknown Buyer",
    buyerEmail: order.buyer ? order.buyer.email : null,
    buyerPhone: order.buyer ? order.buyer.phone : null,
    sellerId: order.sellerId,
    publication: order.publication,
    books: order.books,
    totalPrice: parseFloat(order.totalPrice),
    discountPercentage: parseFloat(order.discountPercentage || 0), // Add discountPercentage
    discountAmount:
      (parseFloat(order.totalPrice) *
        parseFloat(order.discountPercentage || 0)) /
      100,
    deliveryCharges: parseFloat(order.deliveryCharges),
    handlingCharges: parseFloat(order.handlingCharges || 0),
    status: order.status,
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    statusHistory: ensureObject(order.statusHistory),
    message: order.message,
    carrier: order.carrier,
    trackingNumber: order.trackingNumber,
    estimatedDeliveryDate: order.estimatedDeliveryDate,
    actualDeliveryDate: order.actualDeliveryDate,
    invoiceUrl: order.invoiceUrl,
    invoiceDate: order.invoiceDate,
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
      orderRequestId: order.Quote.orderRequestId,
      sellerId: order.Quote.sellerId,
      status: order.Quote.status,
      books: order.Quote.books,
      totalPrice: parseFloat(order.Quote.totalPrice),
      discountPercentage: parseFloat(order.Quote.discountPercentage || 0), // Add discountPercentage
      discountAmount: quoteDiscountAmount, // Add calculated discount amount
      deliveryCharges: parseFloat(order.Quote.deliveryCharges),
      handlingCharges: parseFloat(order.Quote.handlingCharges || 0),
      message: order.Quote.message,
      expiryDate: order.Quote.expiryDate,
      revisionReason: order.Quote.revisionReason,
      revisionHistory: order.Quote.revisionHistory || [],
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
      quoteId: latestPayment.quoteId,
      orderRequestId: latestPayment.orderRequestId,
      status: latestPayment.status,
      paymentMethod: latestPayment.paymentMethod,
      amount: parseFloat(latestPayment.amount),
      transactionId: latestPayment.transactionId,
      paymentDate: latestPayment.paymentDate || latestPayment.createdAt,
      statusHistory: latestPayment.statusHistory || [],
    };
  }

  return formatted;
};

exports.getSellerBooks = async (req, res) => {
  try {
    const sellerId = req.user.id;

    const books = await Book.findAll({
      where: { sellerId },
      order: [["title", "ASC"]],
    });

    // Format the books for the frontend
    const formattedBooks = books.map((book) => ({
      id: book.id,
      code: book.code,
      title: book.title,
      publication: book.publication,
      type: book.type,
      language: book.language,
      subject: book.subject,
      class: book.class,
      price: parseFloat(book.price),
    }));

    res.status(200).json({
      success: true,
      books: formattedBooks,
    });
  } catch (error) {
    console.error("Error fetching seller books:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch book catalog",
    });
  }
};

// Get all orders for current seller
exports.getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.user.id;

    const orders = await OrderRequest.findAll({
      where: { sellerId: sellerId },
      include: [
        {
          model: Quote,
          as: "Quote",
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
      order: [["createdAt", "DESC"]],
    });

    const formattedOrders = orders.map((order) => formatOrderForSeller(order));

    res.status(200).json({
      success: true,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("Error fetching seller orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

// Filter seller orders
exports.filterOrders = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { status, quoteStatus, dateFrom, dateTo } = req.query;

    // Build the where clause
    const whereClause = { sellerId: sellerId };

    if (status) {
      whereClause.status = status;
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

    // Build the include for Quote with optional status filter
    const quoteInclude = {
      model: Quote,
      as: "Quote",
    };

    if (quoteStatus) {
      quoteInclude.where = { status: quoteStatus };
      // Use required: true to make this an inner join when filtering by quote status
      quoteInclude.required = true;
    }

    const orders = await OrderRequest.findAll({
      where: whereClause,
      include: [
        quoteInclude,
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
      order: [["createdAt", "DESC"]],
    });

    const formattedOrders = orders.map((order) => formatOrderForSeller(order));

    res.status(200).json({
      success: true,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("Error filtering seller orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to filter orders",
    });
  }
};

// Search seller orders
exports.searchOrders = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { term } = req.query;

    if (!term) {
      return res.status(400).json({
        success: false,
        message: "Search term is required",
      });
    }

    const searchTerm = `%${term}%`; // For partial matching

    // Get buyer IDs that match the search term
    const buyerIds = await User.findAll({
      attributes: ["id"],
      where: {
        [sequelize.Op.or]: [
          { name: { [sequelize.Op.iLike]: searchTerm } },
          { email: { [sequelize.Op.iLike]: searchTerm } },
        ],
      },
    }).map((user) => user.id);

    // Using Sequelize's literal to search in JSON data
    const orders = await OrderRequest.findAll({
      where: {
        sellerId: sellerId,
        [sequelize.Op.or]: [
          { id: { [sequelize.Op.iLike]: searchTerm } },
          { buyerId: { [sequelize.Op.in]: buyerIds } },
          // Search in books JSON field
          sequelize.literal(`books::text ILIKE '%${term}%'`),
        ],
      },
      include: [
        {
          model: Quote,
          as: "Quote",
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
      order: [["createdAt", "DESC"]],
    });

    const formattedOrders = orders.map((order) => formatOrderForSeller(order));

    res.status(200).json({
      success: true,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("Error searching seller orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search orders",
    });
  }
};

// Get orders by category/pipeline for seller
exports.getOrdersByCategory = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { category } = req.params;

    // Define status mappings based on pipeline steps
    const categoryStatusMap = {
      all: [],
      pending: ["pending"],
      quoted: ["quoted", "quote_revised", "quote_accepted", "quote_rejected"],
      payment: ["awaiting_payment", "payment_failed", "payment_completed"],
      processing: ["processed"],
      shipping: ["shipped"],
      delivered: ["delivered"],
      completed: ["completed"],
      cancelled: ["cancelled", "cancelled_by_seller", "disputed"],
    };

    // Build where clause
    const whereClause = { sellerId: sellerId };

    // Add status filter if not 'all'
    if (category !== "all" && categoryStatusMap[category]) {
      whereClause.status = {
        [sequelize.Op.in]: categoryStatusMap[category],
      };
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
          as: "buyer",
          attributes: ["id", "name", "email", "phone"],
        },
        {
          model: Payment,
          as: "Payments",
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const formattedOrders = orders.map((order) => formatOrderForSeller(order));

    res.status(200).json({
      success: true,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("Error getting seller orders by category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get orders by category",
    });
  }
};

// Get order details
exports.getOrderDetails = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { orderId } = req.params;

    const order = await getSellerOrderWithDetails(orderId, sellerId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      order: formatOrderForSeller(order),
    });
  } catch (error) {
    console.error("Error getting order details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get order details",
    });
  }
};

// Create Quote
exports.createQuote = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const sellerId = req.user.id;
    const { orderId } = req.params;
    const {
      books,
      totalPrice,
      discountPercentage,
      deliveryCharges,
      handlingCharges,
      message,
      status,
    } = req.body;

    if (!books || !totalPrice || deliveryCharges === undefined) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Books, total price, and delivery charges are required",
      });
    }

    const order = await getSellerOrderWithDetails(orderId, sellerId);

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.Quote) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message:
          "Quote already exists for this order. Use update endpoint instead.",
      });
    }

    const quoteStatus = status || "draft";
    const expiryDate =
      quoteStatus === "sent"
        ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        : null;

    const quote = await Quote.create(
      {
        orderRequestId: orderId,
        sellerId: sellerId,
        books,
        totalPrice,
        discountPercentage: discountPercentage || 0,
        deliveryCharges,
        handlingCharges: handlingCharges || 0,
        status: quoteStatus,
        expiryDate,
        message,
        revisionHistory: [],
      },
      { transaction }
    );

    if (quoteStatus === "sent") {
      await order.updateStatus("quoted", sellerId, "Quote sent by seller", {
        transaction,
      });
    }

    await transaction.commit();

    // 🔄 Get updated order after DB changes
    const updatedOrder = await getSellerOrderWithDetails(orderId, sellerId);
    const updatedQuote = updatedOrder.Quote;

    // ✅ Now generate payment link (if quote is sent)
    if (updatedQuote.status === "sent") {
      try {
        const grandTotal = updatedQuote.get("grandTotal");

        const paymentLink = await razorpay.paymentLink.create({
          amount: Math.round(grandTotal * 100),
          currency: "INR",
          description: `Payment for Quote #${updatedQuote.id}`,
          customer: {
            name: updatedOrder.buyer?.name || "Buyer",
            email: updatedOrder.buyer?.email,
            contact: updatedOrder.buyer?.phone,
          },
          notify: {
            sms: false,
            email: false,
          },
          reminder_enable: true,
          callback_url: `${process.env.BUYER_DASHBOARD_URL}`,
          callback_method: "get",
          notes: {
            customer_id: updatedOrder.buyerId,
            quote_id: updatedQuote.id,
            internal_order_id: updatedOrder.id,
          },
        });

        // Save to quote
        await updatedQuote.update({ paymentUrl: paymentLink.short_url });
      } catch (error) {
        console.error("❌ Failed to create Razorpay payment link:", error);
        
      }
    }

    // ✅ Send email
    try {
      const buyer = updatedOrder.buyer;
      const quote = updatedOrder.Quote;

      const buyerEmailData = {
        to: buyer.email,
        subject: `Quote Available for Order #${updatedOrder.id}`,
        template: "quote-created-notification",
        data: {
          buyerName: buyer.name,
          sellerName: req.user.name,
          orderId: updatedOrder.id,
          totalPrice: Number(quote.totalPrice).toFixed(2),
          discountPercentage: quote.discountPercentage || 0,
          deliveryCharges: Number(quote.deliveryCharges).toFixed(2),
          handlingCharges: Number(quote.handlingCharges || 0).toFixed(2),
          finalTotal: quote.grandTotal.toFixed(2),
          sellerMessage: quote.message || "No additional message provided.",
          dashboardLink: process.env.BUYER_DASHBOARD_URL,
          companyName: process.env.COMPANY_NAME,
          supportEmail: process.env.SUPPORT_EMAIL,
          currentYear: new Date().getFullYear(),
          paymentUrl: quote.paymentUrl || null,
        },
      };

      sendQuoteCreatedNotification(buyerEmailData).catch((err) =>
        console.error("Failed to send quote creation email to buyer:", err)
      );
    } catch (emailError) {
      console.error("Error preparing quote email:", emailError);
    }

    res.status(201).json({
      success: true,
      message: "Quote created successfully",
      order: formatOrderForSeller(updatedOrder),
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating quote:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create quote",
    });
  }
};



// Update Quote
exports.updateQuote = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const sellerId = req.user.id;
    const { orderId, quoteId } = req.params;
    const {
      books,
      totalPrice,
      discountPercentage,
      deliveryCharges,
      handlingCharges,
      message,
      status,
    } = req.body;

    const order = await getSellerOrderWithDetails(orderId, sellerId);

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!order.Quote || order.Quote.id !== quoteId) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Quote not found for this order",
      });
    }

    const updateData = {};
    if (books) updateData.books = books;
    if (totalPrice !== undefined) updateData.totalPrice = totalPrice;
    if (discountPercentage !== undefined)
      updateData.discountPercentage = discountPercentage;
    if (deliveryCharges !== undefined)
      updateData.deliveryCharges = deliveryCharges;
    if (handlingCharges !== undefined)
      updateData.handlingCharges = handlingCharges;
    if (message !== undefined) updateData.message = message;
    if (status) updateData.status = status;

    if (order.Quote.status === "draft" && status === "sent") {
      updateData.expiryDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      if (order.status !== "quoted") {
        await order.updateStatus("quoted", sellerId, "Quote sent by seller", {
          transaction,
        });
      }
    }

    if (order.Quote.status === "pending_revision" && status === "revised") {
      const currentQuote = {
        books: order.Quote.books,
        totalPrice: parseFloat(order.Quote.totalPrice),
        deliveryCharges: parseFloat(order.Quote.deliveryCharges),
        handlingCharges: parseFloat(order.Quote.handlingCharges || 0),
        timestamp: new Date(),
        reason: order.Quote.revisionReason || "Quote revised by seller",
        userId: sellerId,
      };

      let revisionHistory = order.Quote.revisionHistory || [];
      if (typeof revisionHistory === "string") {
        revisionHistory = JSON.parse(revisionHistory);
      }

      updateData.revisionHistory = [...revisionHistory, currentQuote];

      if (order.status !== "quote_revised") {
        await order.updateStatus(
          "quote_revised",
          sellerId,
          "Quote revised by seller",
          {
            transaction,
          }
        );
      }
    }

    await order.Quote.update(updateData, { transaction });

    await transaction.commit();

    // 🔄 Fetch updated order and quote
    const updatedOrder = await getSellerOrderWithDetails(orderId, sellerId);
    const updatedQuote = updatedOrder.Quote;

    // ✅ Always generate new payment link if quote is "sent"
    if (updatedQuote.status === "sent") {
      try {
        const grandTotal = updatedQuote.get("grandTotal");

        const paymentLink = await razorpay.paymentLink.create({
          amount: Math.round(grandTotal * 100),
          currency: "INR",
          description: `Payment for Quote #${updatedQuote.id}`,
          customer: {
            name: updatedOrder.buyer?.name || "Buyer",
            email: updatedOrder.buyer?.email,
            contact: updatedOrder.buyer?.phone,
          },
          notify: {
            sms: true,
            email: true,
          },
          reminder_enable: true,
          callback_url: `${process.env.BUYER_DASHBOARD_URL}`,
          callback_method: "get",
          notes: {
            customer_id: updatedOrder.buyerId,
            quote_id: updatedQuote.id,
            internal_order_id: updatedOrder.id,
          },
        });

        await updatedQuote.update({ paymentUrl: paymentLink.short_url });
      } catch (error) {
        console.error("❌ Failed to create Razorpay payment link:", error);
        
      }
    }

    // ✅ Email
    try {
      const buyer = updatedOrder.buyer;
      const quote = updatedOrder.Quote;

      if (quote.status === "sent" || quote.status === "revised") {
        const emailData = {
          to: buyer.email,
          subject: `Quote ${
            quote.status === "revised" ? "Revised" : "Sent"
          } for Order #${updatedOrder.id}`,
          template: "quote-created-notification",
          data: {
            buyerName: buyer.name,
            sellerName: req.user.name,
            orderId: updatedOrder.id,
            totalPrice: Number(quote.totalPrice).toFixed(2),
            discountPercentage: quote.discountPercentage || 0,
            deliveryCharges: Number(quote.deliveryCharges).toFixed(2),
            handlingCharges: Number(quote.handlingCharges || 0).toFixed(2),
            finalTotal: quote.grandTotal.toFixed(2),
            sellerMessage: quote.message || "No additional message provided.",
            dashboardLink: process.env.BUYER_DASHBOARD_URL,
            companyName: process.env.COMPANY_NAME,
            supportEmail: process.env.SUPPORT_EMAIL,
            currentYear: new Date().getFullYear(),
            paymentUrl: quote.paymentUrl || null,
          },
        };

        sendQuoteCreatedNotification(emailData).catch((err) =>
          console.error("Failed to send quote update email to buyer:", err)
        );
      }
    } catch (emailError) {
      console.error("Error preparing quote update email:", emailError);
    }

    res.status(200).json({
      success: true,
      message: "Quote updated successfully",
      order: formatOrderForSeller(updatedOrder),
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating quote:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update quote",
      error: error.message,
    });
  }
};


// Process Order
exports.processOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const sellerId = req.user.id;
    const { orderId } = req.params;
    const { notes } = req.body;

    // Get order
    const order = await getSellerOrderWithDetails(orderId, sellerId);

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order can be processed
    if (order.status !== "payment_completed") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Order must be in payment_completed status to be processed",
      });
    }

    // Update order status
    const processingNote = notes || "Order processed and ready for shipping";
    await order.updateStatus("processed", sellerId, processingNote, {
      transaction,
    });

    // Add processing info
    await order.update(
      {
        processing: {
          timestamp: new Date(),
          notes: processingNote,
        },
      },
      { transaction }
    );

    await transaction.commit();

    // Get updated order
    const updatedOrder = await getSellerOrderWithDetails(orderId, sellerId);

    try {
      const buyer = updatedOrder.buyer;

      const emailData = {
        to: buyer.email,
        subject: `Your Order #${updatedOrder.id} is Now Being Processed`,
        template: "order-processed-notification", // you'll create this below
        data: {
          buyerName: buyer.name,
          sellerName: req.user.name,
          orderId: updatedOrder.id,
          processingDate: new Date().toLocaleString(),
          processingNotes: processingNote,
          dashboardLink: process.env.BUYER_DASHBOARD_URL,
          companyName: process.env.COMPANY_NAME,
          supportEmail: process.env.SUPPORT_EMAIL,
          currentYear: new Date().getFullYear(),
        },
      };

      sendOrderProcessedNotification(emailData).catch((err) => {
        console.error("Failed to send order processed email to buyer:", err);
      });
    } catch (emailError) {
      console.error("Error preparing order processed email:", emailError);
    }


    res.status(200).json({
      success: true,
      message: "Order processed successfully",
      order: formatOrderForSeller(updatedOrder),
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error processing order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process order",
    });
  }
};

// Upload Invoice function
exports.uploadInvoice = async (req, res) => {
  const invoiceUpload = upload.single("invoice");

  invoiceUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: "Error uploading file",
        error: err.message,
      });
    }

    const transaction = await sequelize.transaction();

    try {
      const sellerId = req.user.id;
      const { orderId } = req.params;
      const { notes } = req.body;

      if (!req.file) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Invoice file is required",
        });
      }

      const order = await getSellerOrderWithDetails(orderId, sellerId);

      if (!order) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      const validStatuses = ["processed", "shipped", "delivered", "completed"];
      if (!validStatuses.includes(order.status)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Invoice can only be uploaded for processed or later orders",
        });
      }

      // Generate S3 file key (filename)
      const fileExt = path.extname(req.file.originalname); // .pdf
      const filename = `invoice-${orderId}${fileExt}`;

      // Upload to S3 using stream
      const s3Upload = new Upload({
        client: s3,
        params: {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: `invoices/${filename}`,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        },
      });

      const result = await s3Upload.done();
      const invoiceUrl = result.Location; // This is the full S3 URL

      // Update order
      const invoiceNote = notes
        ? `Invoice uploaded: ${notes}`
        : "Invoice uploaded by seller";
      await order.update(
        {
          invoiceUrl,
          invoiceDate: new Date(),
          invoiceNotes: notes,
        },
        { transaction }
      );

      await order.addStatusHistoryEntry(order.status, invoiceNote, sellerId, {
        transaction,
      });

      await transaction.commit();

      const updatedOrder = await getSellerOrderWithDetails(orderId, sellerId);

      res.status(200).json({
        success: true,
        message: "Invoice uploaded successfully",
        order: formatOrderForSeller(updatedOrder),
      });
    } catch (error) {
      await transaction.rollback();

      console.error("S3 Invoice Upload Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload invoice",
      });
    }
  });
};

// Ship Order
exports.shipOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const sellerId = req.user.id;
    const { orderId } = req.params;
    const { carrier, trackingNumber, estimatedDeliveryDate, notes } = req.body;

    if (!carrier || !trackingNumber) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Carrier and tracking number are required",
      });
    }

    // Get order
    const order = await getSellerOrderWithDetails(orderId, sellerId);

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order can be shipped
    if (order.status !== "processed") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Order must be in processed status to be shipped",
      });
    }

    // Check if invoice has been uploaded
    if (!order.invoiceUrl) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invoice must be uploaded before shipping",
      });
    }

    // Update order status
    const shippingNote =
      notes ||
      `Order shipped via ${carrier} with tracking number ${trackingNumber}`;
    await order.updateStatus("shipped", sellerId, shippingNote, {
      transaction,
    });

    // Process custom carrier name
    const finalCarrier =
      carrier === "other" && req.body.otherCarrier
        ? req.body.otherCarrier
        : carrier;

    // Add shipping info
    await order.update(
      {
        carrier: finalCarrier,
        trackingNumber: trackingNumber,
        shippingDate: new Date(),
        estimatedDeliveryDate: estimatedDeliveryDate
          ? new Date(estimatedDeliveryDate)
          : null,
        shippingNotes: notes,
      },
      { transaction }
    );

    await transaction.commit();

    // Get updated order
    const updatedOrder = await getSellerOrderWithDetails(orderId, sellerId);

    try {
      const buyer = updatedOrder.buyer;

      const emailData = {
        to: buyer.email,
        subject: `Your Order #${updatedOrder.id} Has Been Shipped`,
        template: "order-shipped-notification",
        data: {
          buyerName: buyer.name,
          sellerName: req.user.name,
          orderId: updatedOrder.id,
          carrier: updatedOrder.carrier || "Not specified",
          trackingNumber: updatedOrder.trackingNumber || "N/A",
          shippingDate: new Date().toLocaleString(),
          estimatedDeliveryDate: updatedOrder.estimatedDeliveryDate
            ? new Date(updatedOrder.estimatedDeliveryDate).toLocaleDateString()
            : "Not provided",
          shippingNotes: shippingNote,
          dashboardLink: process.env.BUYER_DASHBOARD_URL,
          companyName: process.env.COMPANY_NAME,
          supportEmail: process.env.SUPPORT_EMAIL,
          currentYear: new Date().getFullYear(),
        },
      };

      sendOrderShippedNotification(emailData).catch((err) => {
        console.error("Failed to send order shipped email to buyer:", err);
      });
    } catch (emailError) {
      console.error("Error preparing order shipped email:", emailError);
    }


    res.status(200).json({
      success: true,
      message: "Order shipped successfully",
      order: formatOrderForSeller(updatedOrder),
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error shipping order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to ship order",
    });
  }
};

// Complete Order function
exports.completeOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const sellerId = req.user.id;
    const { orderId } = req.params;
    const { actualDeliveryDate, notes } = req.body;

    // Get order
    const order = await getSellerOrderWithDetails(orderId, sellerId);

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order can be completed (should be either shipped or delivered)
    if (order.status !== "shipped" && order.status !== "delivered") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Order must be in shipped or delivered status to be completed",
      });
    }

    // If order is in shipped status, first mark as delivered
    if (order.status === "shipped") {
      const deliveryNote = notes || "Order delivered to recipient";
      if (order.updateStatus) {
        await order.updateStatus("delivered", sellerId, deliveryNote, {
          transaction,
        });
      } else {
        // Fallback if updateStatus method is not available
        await order.update({ status: "delivered" }, { transaction });

        // Add to status history
        let currentHistory = order.statusHistory || [];
        if (typeof currentHistory === "string") {
          currentHistory = JSON.parse(currentHistory);
        }

        const historyEntry = {
          status: "delivered",
          timestamp: new Date(),
          notes: deliveryNote,
          userId: sellerId,
        };

        await order.update(
          {
            statusHistory: [...currentHistory, historyEntry],
          },
          { transaction }
        );
      }

      // Add delivery date
      await order.update(
        {
          actualDeliveryDate: actualDeliveryDate
            ? new Date(actualDeliveryDate)
            : new Date(),
        },
        { transaction }
      );

      // If the order was just marked as delivered, don't immediately mark as completed
      // Let it remain in "delivered" state until another action is taken
      await transaction.commit();

      // Get updated order
      const updatedOrder = await getSellerOrderWithDetails(orderId, sellerId);

      // Return response with success message
      return res.status(200).json({
        success: true,
        message: "Order marked as delivered successfully",
        order: formatOrderForSeller(updatedOrder),
      });
    }
    // If order is already in delivered status, mark as completed
    else if (order.status === "delivered") {
      // Mark as completed
      const completionNote = "Order marked as completed";
      if (order.updateStatus) {
        await order.updateStatus("completed", sellerId, completionNote, {
          transaction,
        });
      } else {
        // Fallback if updateStatus method is not available
        await order.update({ status: "completed" }, { transaction });

        // Add to status history
        let currentHistory = order.statusHistory || [];
        if (typeof currentHistory === "string") {
          currentHistory = JSON.parse(currentHistory);
        }

        const historyEntry = {
          status: "completed",
          timestamp: new Date(),
          notes: completionNote,
          userId: sellerId,
        };

        await order.update(
          {
            statusHistory: [...currentHistory, historyEntry],
          },
          { transaction }
        );
      }

      // Add completion info
      await order.update(
        {
          completion: {
            timestamp: new Date(),
            notes: notes || "Order completed",
          },
        },
        { transaction }
      );

      await transaction.commit();

      // Get updated order
      const updatedOrder = await getSellerOrderWithDetails(orderId, sellerId);

      try {
        const buyer = updatedOrder.buyer;

        const emailData = {
          to: buyer.email,
          subject: `Order #${updatedOrder.id} Completed - Thank You!`,
          template: "order-completed-notification", // 🧩 Template to create
          data: {
            buyerName: buyer.name,
            sellerName: req.user.name,
            orderId: updatedOrder.id,
            completionDate: new Date().toLocaleString(), // ⏰ use now
            notes: notes || "Thank you for your order!",
            dashboardLink: process.env.BUYER_DASHBOARD_URL,
            companyName: process.env.COMPANY_NAME,
            supportEmail: process.env.SUPPORT_EMAIL,
            currentYear: new Date().getFullYear(),
          },
        };

        sendOrderCompletedNotification(emailData).catch((err) => {
          console.error("Failed to send order completion email to buyer:", err);
        });
      } catch (emailError) {
        console.error("Error preparing order completion email:", emailError);
      }


      // Return response with success message
      return res.status(200).json({
        success: true,
        message: "Order completed successfully",
        order: formatOrderForSeller(updatedOrder),
      });
    }
  } catch (error) {
    await transaction.rollback();
    console.error("Error completing order:", error);

    // Make sure to return an error response
    return res.status(500).json({
      success: false,
      message: "Failed to complete order",
      error: error.message,
    });
  }
};

// Cancel Order
exports.cancelOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const sellerId = req.user.id;
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
    const order = await getSellerOrderWithDetails(orderId, sellerId);

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order can be cancelled by seller
    const cancellableStatuses = [
      "pending",
      "quoted",
      "quote_revised",
      "quote_accepted",
      "awaiting_payment",
    ];

    if (!cancellableStatuses.includes(order.status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "This order cannot be cancelled at its current stage",
      });
    }

    // Update order status
    const cancellationNote = `Order cancelled by seller. Reason: ${reason}${
      notes ? `. Notes: ${notes}` : ""
    }`;
    await order.updateStatus(
      "cancelled_by_seller",
      sellerId,
      cancellationNote,
      { transaction }
    );

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
    const updatedOrder = await getSellerOrderWithDetails(orderId, sellerId);

    try {
      const buyer = updatedOrder.buyer;

      const buyerEmailData = {
        to: buyer.email,
        subject: `Order #${updatedOrder.id} Cancelled by Seller`,
        template: "order-cancelled-by-seller", // 🧩 You’ll create this template
        data: {
          buyerName: buyer.name,
          sellerName: req.user.name,
          orderId: updatedOrder.id,
          cancellationReason: reason,
          cancellationNotes: notes || "No additional notes provided.",
          cancellationDate: new Date().toLocaleString(),
          dashboardLink: process.env.BUYER_DASHBOARD_URL,
          companyName: process.env.COMPANY_NAME,
          supportEmail: process.env.SUPPORT_EMAIL,
          currentYear: new Date().getFullYear(),
        },
      };

      sendOrderCancelledBySellerNotification(buyerEmailData).catch((err) => {
        console.error("Failed to send order cancellation email to buyer:", err);
      });
    } catch (emailError) {
      console.error("Error preparing order cancellation email:", emailError);
    }


    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order: formatOrderForSeller(updatedOrder),
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
