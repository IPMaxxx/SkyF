"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useIsLoggedIn() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        setLoggedIn(!!data.session);
      });
  }, []);

  return loggedIn;
}
