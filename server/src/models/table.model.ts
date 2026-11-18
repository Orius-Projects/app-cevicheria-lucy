import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ITable {
  code: string;
  zone?: string;
  seats?: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITableDocument extends ITable, Document {}

const TableSchema = new Schema<ITableDocument>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    zone: {
      type: String,
      trim: true
    },
    seats: {
      type: Number,
      min: 1
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

// Índices canónicos según data-model.md §3.2
// Nota constitucional: tables NO tiene waiterId asignado
// El índice único de code se define en el campo ({ unique: true })
TableSchema.index({ active: 1, zone: 1 });

export const Table: Model<ITableDocument> =
  mongoose.models.Table || mongoose.model<ITableDocument>('Table', TableSchema);

export default Table;
