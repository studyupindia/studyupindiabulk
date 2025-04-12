const constants = require("../../config/constants/schema");

module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    "Payment",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      quoteId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      orderRequestId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          isDecimal: true,
          min: 0,
        },
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending",
        validate: {
          isIn: [constants.PAYMENT_STATUSES],
        },
      },
      paymentMethod: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isIn: [constants.PAYMENT_METHODS],
        },
      },
      transactionId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      paymentDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // New fields for payment tracking
      isPartialPayment: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      remainingAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      statusHistory: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        // Format: [{ status, timestamp, notes, userId }]
      },
      refundAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      refundDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      refundReason: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      meta: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: "payments",
      timestamps: true,
      indexes: [
        {
          fields: ["quoteId", "orderRequestId", "status"],
        },
      ],
      hooks: {
        beforeSave: (instance, options) => {
          // Track payment status changes
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

  Payment.associate = (models) => {
    Payment.belongsTo(models.Quote, { foreignKey: "quoteId", as: "Quote" });
    Payment.belongsTo(models.OrderRequest, {
      foreignKey: "orderRequestId",
      as: "OrderRequest",
    });
    Payment.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "Creator",
    });
  };

  // Payment status update method
  Payment.prototype.updateStatus = async function (
    newStatus,
    userId,
    notes,
    options = {}
  ) {
    const allowedTransitions = {
      pending: ["processing", "completed", "failed"],
      processing: ["completed", "failed"],
      completed: ["refunded", "partially_refunded"],
      failed: ["pending"],
      refunded: [],
      partially_refunded: ["refunded"],
    };

    if (!allowedTransitions[this.status].includes(newStatus)) {
      throw new Error(
        `Cannot transition payment from ${this.status} to ${newStatus}`
      );
    }

    this.set({ status: newStatus });

    await this.save({
      userId,
      statusNotes: notes,
      transaction: options.transaction || undefined,
    });

    return this;
  };


  // Process refund method
  Payment.prototype.processRefund = async function (
    refundAmount,
    reason,
    userId
  ) {
    if (this.status !== "completed") {
      throw new Error("Only completed payments can be refunded");
    }

    const totalAmount = parseFloat(this.amount);
    const refundAmtValue = parseFloat(refundAmount);

    if (refundAmtValue <= 0 || refundAmtValue > totalAmount) {
      throw new Error("Invalid refund amount");
    }

    const newStatus =
      refundAmtValue === totalAmount ? "refunded" : "partially_refunded";

    await this.update(
      {
        status: newStatus,
        refundAmount: refundAmtValue,
        refundDate: new Date(),
        refundReason: reason,
      },
      {
        userId: userId,
        statusNotes: `Refunded ₹${refundAmtValue.toFixed(
          2
        )}. Reason: ${reason}`,
      }
    );

    return this;
  };

  return Payment;
};