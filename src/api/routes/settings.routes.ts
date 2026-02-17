/**
 * Settings Routes
 * HTTP routes for application settings management
 */

import { Router } from 'express';
import { createSettingsController } from '../controllers/settings.controller';

const router = Router();
const controller = createSettingsController();

/**
 * GET /settings
 * Get current settings (API keys are masked)
 */
router.get('/', (req, res, next) => controller.getSettings(req, res, next));

/**
 * PUT /settings
 * Update settings (writes to .env file)
 */
router.put('/', (req, res, next) => controller.updateSettings(req, res, next));

export default router;
