import mongoose, { Model, Schema, HydratedDocument } from 'mongoose';

export interface ISettings {
  _id: string;
  restaurantName: string;
  currency: string;
  lowStockThreshold: number;
  updatedAt: Date;
}

export type ISettingsDocument = HydratedDocument<ISettings>;

const SettingsSchema = new Schema<ISettings>(
  {
    _id: {
      type: String,
      default: 'global',
      required: true
    },
    restaurantName: {
      type: String,
      default: 'Cevichería Lucy',
      required: true,
      trim: true
    },
    currency: {
      type: String,
      default: 'PEN',
      required: true,
      trim: true
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      required: true
    },
    updatedAt: {
      type: Date,
      default: Date.now,
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

export const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);

export default Settings;
