"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useIsLoggedIn() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        setLoggedIn(!!data.user);
      });
  }, []);

  return loggedIn;
}
