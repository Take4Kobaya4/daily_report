"use client";

import { RegisterFormPresenter } from "./RegisterFormPresenter";
import { useRegisterForm } from "./useRegisterForm";

export function RegisterFormContainer() {
  const { register, errors, isSubmitting, errorMessage, handleSubmit } =
    useRegisterForm();

  return (
    <RegisterFormPresenter
      register={register}
      errors={errors}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      onSubmit={handleSubmit}
    />
  );
}
