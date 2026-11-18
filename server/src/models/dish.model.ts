import mongoose, { Document, Model, Schema } from 'mongoose';
import { DishCourse, DishVariation } from '@cevicheria/shared';

export interface IDish {
  sectionId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  priceCents: number;
  course: DishCourse;
  isFixed: boolean;
  isRotating: boolean;
  sortOrder: number;
  variations: DishVariation[];
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDishDocument extends IDish, Document {}

const DishVariationSchema = new Schema<DishVariation>(
  {
    id: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const DishSchema = new Schema<IDishDocument>(
  {
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuSection',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
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
    course: {
      type: String,
      enum: ['ENTRADA', 'FONDO', 'PLATO', 'BEBIDA', 'OTRO'],
      required: true
    },
    isFixed: {
      type: Boolean,
      default: false,
      required: true
    },
    isRotating: {
      type: Boolean,
      default: false,
      required: true
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    variations: {
      type: [DishVariationSchema],
      default: []
    },
    active: {
      type: Boolean,
      default: true,
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

// Índices canónicos según data-model.md §3.6
DishSchema.index({ sectionId: 1, active: 1, sortOrder: 1 });
DishSchema.index({ name: 1 });

export const Dish: Model<IDishDocument> =
  mongoose.models.Dish || mongoose.model<IDishDocument>('Dish', DishSchema);

export default Dish;
