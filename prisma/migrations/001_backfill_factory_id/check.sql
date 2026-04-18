SELECT 'Factories:' as info;
SELECT id, name, is_system FROM factories;
SELECT 'Subscriptions:' as info;
SELECT id, factory_id FROM subscriptions;