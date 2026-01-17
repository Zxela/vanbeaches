import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import tidesRouter from './routes/tidesRoute.js';
import weatherRouter from './routes/weatherRoute.js';
import waterQualityRouter from './routes/waterQualityRoute.js';
import beachesRouter from './routes/beachesRoute.js';
import { setupDataRefreshJobs } from './jobs/dataRefreshJob.js';
import { startScheduler } from './jobs/scheduler.js';

const app: Express = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api', healthRouter);
app.use('/api', beachesRouter);
app.use('/api', tidesRouter);
app.use('/api', weatherRouter);
app.use('/api', waterQualityRouter);

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  setupDataRefreshJobs();
  startScheduler();
}

app.listen(PORT, () => { console.log('Van Beaches server running on port ' + PORT); });
export default app;
