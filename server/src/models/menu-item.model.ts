import mongoose, { Document, Model, Schema } from 'mongoose';
import { DishStatus, deriveDishStatus } from '@cevicheria/shared';

export interface IMenuItem {
  menuDayId: mongoose.Types.ObjectId;
  dishId: mongoose.Types.ObjectId;
  dishName: string;
  sectionKey: string;
  priceCents: number;
  active: boolean;
  hasRationsLimit: boolean;
  totalRations?: number | null;
  remainingRations?: number | null;
  lowStockThreshold: number;
  manuallySoldOut: boolean;
  soldOutReason?: string | null;
  soldOutBy?: mongoose.Types.ObjectId | null;
  soldOutAt?: Date | null;
  updatedBy?: mongoose.Types.ObjectId | null;
  updatedAt: Date;
  version: number;
}

export interface IMenuItemDocument extends IMenuItem, Document {
  readonly status: DishStatus;
}

const MenuItemSchema = new Schema<IMenuItemDocument>(
  {
    menuDayId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuDay',
      required: true
    },
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
    sectionKey: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    priceCents: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'priceCents debe ser un número entero'
      }
    },
    active: {
      type: Boolean,
      default: true,
      required: true
    },
    hasRationsLimit: {
      type: Boolean,
      default: false,
      required: true
    },
    totalRations: {
      type: Number,
      min: 0,
      default: null
    },
    remainingRations: {
      type: Number,
      min: 0,
      default: null
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      required: true
    },
    manuallySoldOut: {
      type: Boolean,
      default: false,
      required: true
    },
    soldOutReason: {
      type: String,
      trim: true,
      default: null
    },
    soldOutBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    soldOutAt: {
      type: Date,
      default: null
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    version: {
      type: Number,
      default: 0,
      required: true
    }
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret.__v;
        ret.id = ret._id ? ret._id.toString() : ret.id;
        return ret;
      }
    }
  }
);

// Virtual para estado derivado del plato (data-model.md §3.8)
MenuItemSchema.virtual('status').get(function (this: IMenuItemDocument): DishStatus {
  return deriveDishStatus({
    active: this.active,
    manuallySoldOut: this.manuallySoldOut,
    hasRationsLimit: this.hasRationsLimit,
    remainingRations: this.remainingRations,
    lowStockThreshold: this.lowStockThreshold
  });
});

// Índices canónicos según data-model.md §3.8
MenuItemSchema.index({ menuDayId: 1, dishId: 1 }, { unique: true });
MenuItemSchema.index({ menuDayId: 1, active: 1 });

export const MenuItem: Model<IMenuItemDocument> =
  mongoose.models.MenuItem || mongoose.model<IMenuItemDocument>('MenuItem', MenuItemSchema);

export default MenuItem;
