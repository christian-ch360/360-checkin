-- Reserve an engagement-rate column on social_connections for a future metric
ALTER TABLE "social_connections" ADD COLUMN "engagementRate" DECIMAL(5,2);
