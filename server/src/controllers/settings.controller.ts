import { Request, Response, NextFunction } from 'express';
import * as settingsService from '../services/settings.service';

export async function getSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await settingsService.getSettings();
    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await settingsService.updateSettings(req.body);
    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
}
