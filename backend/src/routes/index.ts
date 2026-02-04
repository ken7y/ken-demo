import { Router } from 'express';
import { healthRoutes } from './health';
import { botRoutes } from './bot';
import { webhookRoutes } from './webhook';
import { eventsRoutes } from './events';

const router: Router = Router();

router.use('/health', healthRoutes);
router.use('/bot', botRoutes);
router.use('/webhook', webhookRoutes);
router.use('/events', eventsRoutes);

export { router as routes };
