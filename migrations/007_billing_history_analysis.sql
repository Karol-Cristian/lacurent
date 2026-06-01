ALTER TABLE house_monthly_bills ADD COLUMN reading_type TEXT DEFAULT 'actual';
ALTER TABLE house_monthly_bills ADD COLUMN is_regularization INTEGER DEFAULT 0;
