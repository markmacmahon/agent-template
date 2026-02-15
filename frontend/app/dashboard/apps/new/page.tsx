"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addApp } from "@/components/actions/apps-action";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submitButton";

const initialState = { message: "" };

export default function CreateAppPage() {
  const [state, dispatch] = useActionState(addApp, initialState);

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold text-foreground">
            Create New App
          </h1>
          <p className="text-lg text-muted-foreground">
            Enter the details of the new app below.
          </p>
        </header>

        <form
          action={dispatch}
          className="bg-card rounded-lg shadow-lg p-8 space-y-6"
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="name">App Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="App name"
                required
                className="w-full"
              />
              {state.errors?.name && (
                <p className="text-destructive text-sm">{state.errors.name}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="description">App Description</Label>
              <Input
                id="description"
                name="description"
                type="text"
                placeholder="Description of the app"
                required
                className="w-full"
              />
              {state.errors?.description && (
                <p className="text-destructive text-sm">
                  {state.errors.description}
                </p>
              )}
            </div>
          </div>

          <SubmitButton text="Create App" />

          {state?.message && (
            <div className="mt-2 text-center text-sm text-destructive">
              <p>{state.message}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
