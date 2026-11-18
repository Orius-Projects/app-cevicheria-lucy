import mongoose, { Document, Model, Schema } from 'mongoose';
import { MenuDayStatus } from '@cevicheria/shared';

export interface IMenuDay {
  date: string;
  status: MenuDayStatus;
  publishedBy?: mongoose.Types.ObjectId | null;
  publishedAt?: Date | null;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMenuDayDocument extends IMenuDay, Document {}

const MenuDaySchema = new Schema<IMenuDayDocument>(
  {
    date: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    status: {
      type: String,
      enum: ['BORRADOR', 'PUBLICADO'],
      default: 'BORRADOR',
      required: true
    },
    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    publishedAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      trim: true
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

// Índices canónicos según data-model.md §3.7
// El índice único de date se define en el campo ({ unique: true })
MenuDaySchema.index({ status: 1 });

export const MenuDay: Model<IMenuDayDocument> =
  mongoose.models.MenuDay || mongoose.model<IMenuDayDocument>('MenuDay', MenuDaySchema);

export default MenuDay;
