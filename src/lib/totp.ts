"use client";

import { useState, useEffect, useRef } from "react";
import { 
  authenticator 
} from "otplib";

/**
 * Utility to isolate TOTP logic from component lifecycle
 */
export const totp = {
  generateSecret: () => authenticator.generateSecret(),
  generateUri: (user: string, secret: string) => authenticator.keyuri(user, 'GestionPro', secret),
  check: (token: string, secret: string) => {
    try {
      return authenticator.check(token, secret);
    } catch (e) {
      return false;
    }
  }
};
