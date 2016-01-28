USE oic;

SET AUTOCOMMIT = 0;

START TRANSACTION;

-- Bilirubin App
DELETE FROM client_grant_type WHERE owner_id = (SELECT id from client_details where client_id = 'bilirubin_chart');
DELETE FROM client_scope WHERE owner_id = (SELECT id from client_details where client_id = 'bilirubin_chart');
DELETE FROM client_details WHERE client_id = 'bilirubin_chart';

COMMIT;

SET AUTOCOMMIT = 1;
