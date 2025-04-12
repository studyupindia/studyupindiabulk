const constants = require("../../config/constants/schema");

module.exports = (sequelize, DataTypes) => {
  const OrderRequest = sequelize.define(
    "OrderRequest",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      buyerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      sellerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      publication: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      books: {
        type: DataTypes.JSON,
        allowNull: false,
        validate: {
          isValidBooks(value) {
            if (!Array.isArray(value)) {
              throw new Error("Books must be an array of book details.");
            }
          },
        },
      },
      totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          isDecimal: true,
          min: 0,
        },
      },
      discountPercentage: {
        type: DataTypes.DECIMAL(5, 2), // Allows up to 100.00%
        allowNull: false,
        defaultValue: 0,
        validate: {
          isDecimal: true,
          min: 0,
          max: 100,
        },
      },
      // Add virtual getter for discountAmount
      discountAmount: {
        type: DataTypes.VIRTUAL,
        get() {
          const totalPrice = parseFloat(this.getDataValue("totalPrice") || 0);
          const discountPercentage = parseFloat(
            this.getDataValue("discountPercentage") || 0
          );
          return (totalPrice * discountPercentage) / 100;
        },
      },
      deliveryCharges: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          isDecimal: true,
          min: 0,
        },
      },
      handlingCharges: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          isDecimal: true,
          min: 0,
        },
      },
      grandTotal: {
        type: DataTypes.VIRTUAL,
        get() {
          const totalPrice = parseFloat(this.getDataValue("totalPrice") || 0);
          const discountAmount = this.get("discountAmount"); // Use the virtual getter
          const deliveryCharges = parseFloat(
            this.getDataValue("deliveryCharges") || 0
          );
          const handlingCharges = parseFloat(
            this.getDataValue("handlingCharges") || 0
          );

          return (
            totalPrice - discountAmount + deliveryCharges + handlingCharges
          );
        },
      },
      invoiceUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },
      billingUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending",
        validate: {
          isIn: [constants.ORDER_REQUEST_STATUSES],
        },
      },
      // New shipping fields
      trackingNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      carrier: {
        type: DataTypes.STRING,
        allowNull: true,
        // validate: {
        //   isIn: [constants.SHIPPING_CARRIERS],
        // },
      },
      estimatedDeliveryDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      actualDeliveryDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // Order history tracking
      statusHistory: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        // Format: [{ status, timestamp, notes, userId }]
      },
      shippingAddress: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      billingAddress: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      meta: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      message: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "order_requests",
      timestamps: true,
      indexes: [
        { fields: ["buyerId"] },
        { fields: ["sellerId"] },
        { fields: ["status"] },
      ],
      hooks: {
        beforeSave: (instance, options) => {
          // Track status changes in history
          if (instance.changed("status")) {
            const newStatus = instance.status;
            const userId = options.userId || null;

            const historyEntry = {
              status: newStatus,
              timestamp: new Date(),
              notes: options.statusNotes || null,
              userId: userId,
            };

            let currentHistory = instance.statusHistory || [];
            if (typeof currentHistory === "string") {
              currentHistory = JSON.parse(currentHistory);
            }

            instance.statusHistory = [...currentHistory, historyEntry];
          }
        },
      },
    }
  );

  OrderRequest.associate = (models) => {
    OrderRequest.belongsTo(models.User, { as: "buyer", foreignKey: "buyerId" });
    OrderRequest.belongsTo(models.User, {
      as: "seller",
      foreignKey: "sellerId",
    });
    OrderRequest.hasOne(models.Quote, { foreignKey: "orderRequestId" });
    OrderRequest.hasMany(models.Payment, { foreignKey: "orderRequestId" });
  };

  // Status transition validation method
  OrderRequest.prototype.updateStatus = async function (
    newStatus,
    userId,
    notes
  ) {
    const allowedTransitions = {
      pending: ["quoted", "cancelled", "cancelled_by_seller"],
      quoted: [
        "quote_revised",
        "quote_accepted",
        "quote_rejected",
        "cancelled",
        "cancelled_by_seller",
      ],
      quote_revised: [
        "quote_accepted",
        "quote_rejected",
        "cancelled",
        "cancelled_by_seller",
      ],
      quote_accepted: ["awaiting_payment", "cancelled", "cancelled_by_seller"],
      awaiting_payment: [
        "payment_failed",
        "payment_completed",
        "cancelled",
        "cancelled_by_seller",
      ],
      payment_failed: ["awaiting_payment", "cancelled", "cancelled_by_seller"],
      payment_completed: ["processed", "cancelled_by_seller", "disputed"],
      processed: ["shipped", "cancelled_by_seller", "disputed"],
      shipped: ["delivered", "disputed"],
      delivered: ["completed", "disputed"],
      completed: ["disputed"],
      cancelled: [],
      cancelled_by_seller: [],
      disputed: ["completed", "cancelled", "cancelled_by_seller"],
    };

    // Validate transition
    if (!allowedTransitions[this.status].includes(newStatus)) {
      throw new Error(`Cannot transition from ${this.status} to ${newStatus}`);
    }

    // Update with history tracking
    await this.update(
      { status: newStatus },
      {
        userId: userId,
        statusNotes: notes,
      }
    );

    return this;
  };

  // Add this to the OrderRequest model definition
  OrderRequest.prototype.addStatusHistoryEntry = async function (
    status,
    notes,
    userId,
    options = {}
  ) {
    // Create a new history entry
    const historyEntry = {
      status: status,
      timestamp: new Date(),
      notes: notes || null,
      userId: userId,
    };

    // Get current history array
    let currentHistory = this.statusHistory || [];

    // Ensure it's an array
    if (typeof currentHistory === "string") {
      currentHistory = JSON.parse(currentHistory);
    }

    // Add new entry
    currentHistory.push(historyEntry);

    // Update the model
    return await this.update({ statusHistory: currentHistory }, options);
  };

  return OrderRequest;
};
