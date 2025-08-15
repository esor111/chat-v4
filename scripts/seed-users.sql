-- Insert the two users needed for testing
INSERT INTO users (user_id, created_at, updated_at) VALUES 
('afc70db3-6f43-4882-92fd-4715f25ffc95', NOW(), NOW()),
('c5c3d135-4968-450b-9fca-57f01e0055f7', NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Verify the users were inserted
SELECT user_id, created_at FROM users WHERE user_id IN (
  'afc70db3-6f43-4882-92fd-4715f25ffc95',
  'c5c3d135-4968-450b-9fca-57f01e0055f7'
);