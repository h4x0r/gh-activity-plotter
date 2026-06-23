"use server";

import { signIn, signOut } from "@/auth";

export async function doSignIn() {
  await signIn("github");
}

export async function doSignOut() {
  await signOut({ redirectTo: "/" });
}
