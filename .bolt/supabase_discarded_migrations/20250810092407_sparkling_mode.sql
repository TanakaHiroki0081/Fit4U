@@ .. @@
 ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-CREATE POLICY "Service role can manage payments"
-  ON payments
-  FOR ALL
-  TO service_role
-  USING (true)
-  WITH CHECK (true);
+-- Create policies with idempotent checks
+DO $$
+BEGIN
+  -- Service role can manage payments
+  IF NOT EXISTS (
+    SELECT 1 FROM pg_policies 
+    WHERE schemaname = 'public' 
+    AND tablename = 'payments' 
+    AND policyname = 'Service role can manage payments'
+  ) THEN
+    CREATE POLICY "Service role can manage payments"
+      ON payments
+      FOR ALL
+      TO service_role
+      USING (true)
+      WITH CHECK (true);
+  END IF;

-CREATE POLICY "Authenticated users can view own payments"
-  ON payments
-  FOR SELECT
-  TO authenticated
-  USING (trainee_id = auth.uid());
+  -- Authenticated users can view own payments
+  IF NOT EXISTS (
+    SELECT 1 FROM pg_policies 
+    WHERE schemaname = 'public' 
+    AND tablename = 'payments' 
+    AND policyname = 'Authenticated users can view own payments'
+  ) THEN
+    CREATE POLICY "Authenticated users can view own payments"
+      ON payments
+      FOR SELECT
+      TO authenticated
+      USING (trainee_id = auth.uid());
+  END IF;

-CREATE POLICY "Trainers can view lesson payments"
-  ON payments
-  FOR SELECT
-  TO authenticated
-  USING (
-    EXISTS (
-      SELECT 1 FROM lessons 
-      WHERE lessons.id = payments.lesson_id 
-      AND lessons.trainer_id = auth.uid()
-    )
-  );
+  -- Trainers can view lesson payments
+  IF NOT EXISTS (
+    SELECT 1 FROM pg_policies 
+    WHERE schemaname = 'public' 
+    AND tablename = 'payments' 
+    AND policyname = 'Trainers can view lesson payments'
+  ) THEN
+    CREATE POLICY "Trainers can view lesson payments"
+      ON payments
+      FOR SELECT
+      TO authenticated
+      USING (
+        EXISTS (
+          SELECT 1 FROM lessons 
+          WHERE lessons.id = payments.lesson_id 
+          AND lessons.trainer_id = auth.uid()
+        )
+      );
+  END IF;

-CREATE POLICY "Admins can view all payments"
-  ON payments
-  FOR SELECT
-  TO authenticated
-  USING (
-    EXISTS (
-      SELECT 1 FROM users 
-      WHERE users.id = auth.uid() 
-      AND users.role = 'admin'
-    )
-  );
+  -- Admins can view all payments
+  IF NOT EXISTS (
+    SELECT 1 FROM pg_policies 
+    WHERE schemaname = 'public' 
+    AND tablename = 'payments' 
+    AND policyname = 'Admins can view all payments'
+  ) THEN
+    CREATE POLICY "Admins can view all payments"
+      ON payments
+      FOR SELECT
+      TO authenticated
+      USING (
+        EXISTS (
+          SELECT 1 FROM users 
+          WHERE users.id = auth.uid() 
+          AND users.role = 'admin'
+        )
+      );
+  END IF;
+END $$;