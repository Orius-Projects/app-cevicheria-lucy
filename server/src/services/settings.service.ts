import { Settings } from '../models/settings.model';

export async function getSettings() {
  let settings = await Settings.findById('global');
  if (!settings) {
    settings = await Settings.create({
      _id: 'global',
      restaurantName: 'Cevichería Lucy',
      currency: 'PEN',
      lowStockThreshold: 5,
      updatedAt: new Date()
    });
  }
  return {
    restaurantName: settings.restaurantName,
    currency: settings.currency,
    lowStockThreshold: settings.lowStockThreshold
  };
}

export async function updateSettings(data: {
  restaurantName?: string;
  lowStockThreshold?: number;
}) {
  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (data.restaurantName !== undefined) updateData.restaurantName = data.restaurantName;
  if (data.lowStockThreshold !== undefined) updateData.lowStockThreshold = data.lowStockThreshold;

  const settings = await Settings.findByIdAndUpdate(
    'global',
    { $set: updateData },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return {
    restaurantName: settings.restaurantName,
    currency: settings.currency,
    lowStockThreshold: settings.lowStockThreshold
  };
}
