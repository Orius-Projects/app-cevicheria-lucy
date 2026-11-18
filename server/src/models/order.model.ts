import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  OrderItem,
  OrderStatus,
  OrderStatusHistoryEntry
} from '@cevicheria/shared';

export interface IOrder {
  orderNumber: number;
  shiftId: mongoose.Types.ObjectId;
  tableId: mongoose.Types.ObjectId;
  tableCode: string;
  tableSessionId: mongoose.Types.ObjectId;
  takenByUserId: mongoose.Types.ObjectId;
  takenByName: string;
  readyByUserId?: mongoose.Types.ObjectId | null;
  readyByName?: string | null;
  deliveredByUserId?: mongoose.Types.ObjectId | null;
  deliveredByName?: string | null;
  cancelledByUserId?: mongoose.Types.ObjectId | null;
  cancelledByName?: string | null;
  status: OrderStatus;
  items: OrderItem[];
  notes?: string | null;
  totalCents: number;
  currency: string;
  statusHistory: OrderStatusHistoryEntry[];
  enviadoEn: Date;
  listoEn?: Date | null;
  entregadoEn?: Date | null;
  canceladoEn?: Date | null;
  cancelReason?: string | null;
  manualClose: boolean;
  manualCloseReason?: string | null;
  clientRequestId?: string | null;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IOrderDocument extends IOrder, Document {}

const OrderItemVariationSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true }
  },
  { _id: false }
);

const OrderItemSchema = new Schema(
  {
    dishId: {
      type: Schema.Types.ObjectId,
      ref: 'Dish',
      required: true
    },
    dishName: {
      type: String,
      required: true,
      trim: true
    },
    sectionName: {
      type: String,
      required: true,
      trim: true
    },
    unitPriceCents: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'unitPriceCents debe ser un número entero'
      }
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'quantity debe ser un número entero >= 1'
      }
    },
    variations: {
      type: [OrderItemVariationSchema],
      default: []
    },
    notes: {
      type: String,
      maxlength: 140,
      trim: true
    },
    lineTotalCents: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'lineTotalCents debe ser un número entero'
      }
    }
  },
  { _id: false }
);

const OrderStatusHistorySchema = new Schema(
  {
    status: {
      type: String,
      enum: ['ENVIADO', 'LISTO', 'ENTREGADO', 'CANCELADO'],
      required: true
    },
    previousStatus: {
      type: String,
      enum: ['BORRADOR', 'ENVIADO', 'LISTO', 'ENTREGADO', 'CANCELADO'],
      default: null
    },
    at: {
      type: Date,
      default: Date.now,
      required: true
    },
    byUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    byName: {
      type: String,
      required: true,
      trim: true
    },
    byRole: {
      type: String,
      enum: ['ENCARGADO', 'MOZO', 'COCINERO', 'SISTEMA'],
      required: true
    },
    reason: {
      type: String,
      trim: true
    },
    version: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrderDocument>(
  {
    orderNumber: {
      type: Number,
      required: true,
      unique: true
    },
    shiftId: {
      type: Schema.Types.ObjectId,
      ref: 'Shift',
      required: true
    },
    tableId: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      required: true
    },
    tableCode: {
      type: String,
      required: true,
      trim: true
    },
    tableSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'TableSession',
      required: true
    },
    takenByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    takenByName: {
      type: String,
      required: true,
      trim: true
    },
    readyByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    readyByName: {
      type: String,
      trim: true,
      default: null
    },
    deliveredByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    deliveredByName: {
      type: String,
      trim: true,
      default: null
    },
    cancelledByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    cancelledByName: {
      type: String,
      trim: true,
      default: null
    },
    status: {
      type: String,
      enum: ['ENVIADO', 'LISTO', 'ENTREGADO', 'CANCELADO'],
      default: 'ENVIADO',
      required: true
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (v: any[]) => Array.isArray(v) && v.length >= 1,
        message: 'Un pedido debe contener al menos un ítem'
      }
    },
    notes: {
      type: String,
      maxlength: 280,
      trim: true,
      default: null
    },
    totalCents: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'totalCents debe ser un número entero'
      }
    },
    currency: {
      type: String,
      default: 'PEN',
      required: true
    },
    statusHistory: {
      type: [OrderStatusHistorySchema],
      required: true,
      default: []
    },
    enviadoEn: {
      type: Date,
      default: Date.now,
      required: true
    },
    listoEn: {
      type: Date,
      default: null
    },
    entregadoEn: {
      type: Date,
      default: null
    },
    canceladoEn: {
      type: Date,
      default: null
    },
    cancelReason: {
      type: String,
      trim: true,
      default: null
    },
    manualClose: {
      type: Boolean,
      default: false,
      required: true
    },
    manualCloseReason: {
      type: String,
      trim: true,
      default: null
    },
    clientRequestId: {
      type: String,
      trim: true,
      default: null
    },
    version: {
      type: Number,
      default: 0,
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret.__v;
        ret.id = ret._id ? ret._id.toString() : ret.id;
        return ret;
      }
    }
  }
);

// Índices canónicos según data-model.md §3.10
// Restricción constitucional: PROHIBIDO customer, paymentStatus, paymentMethod, taxCents, igvRate, billing
// El índice único de orderNumber se define en el campo ({ unique: true })
OrderSchema.index({ clientRequestId: 1 }, { unique: true, sparse: true });
OrderSchema.index({ status: 1, enviadoEn: 1 });
OrderSchema.index({ shiftId: 1, status: 1 });
OrderSchema.index({ tableSessionId: 1 });
OrderSchema.index({ takenByUserId: 1, status: 1 });

export const Order: Model<IOrderDocument> =
  mongoose.models.Order || mongoose.model<IOrderDocument>('Order', OrderSchema);

export default Order;
