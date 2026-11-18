import mongoose, { Model, Schema, HydratedDocument } from 'mongoose';

export interface ICounter {
  _id: string;
  seq: number;
}

export type ICounterDocument = HydratedDocument<ICounter>;

const CounterSchema = new Schema<ICounter>(
  {
    _id: {
      type: String,
      required: true
    },
    seq: {
      type: Number,
      default: 0,
      required: true
    }
  },
  {
    timestamps: false,
    _id: false,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const Counter: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);

export default Counter;
