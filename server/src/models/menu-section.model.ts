import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IMenuSection {
  key: string;
  name: string;
  sortOrder: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMenuSectionDocument extends IMenuSection, Document {}

const MenuSectionSchema = new Schema<IMenuSectionDocument>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0
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

// Índices canónicos según data-model.md §3.5
// El índice único de key se define en el campo ({ unique: true })
MenuSectionSchema.index({ active: 1, sortOrder: 1 });

export const MenuSection: Model<IMenuSectionDocument> =
  mongoose.models.MenuSection ||
  mongoose.model<IMenuSectionDocument>('MenuSection', MenuSectionSchema);

export default MenuSection;
