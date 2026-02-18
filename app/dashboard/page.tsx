import ButtonAccount from "@/components/ButtonAccount";

export const dynamic = "force-dynamic";

// Esta es una página privada: Está protegida por el componente layout.js que asegura que el usuario esté autenticado.
// Es un componente de servidor, lo que significa que puedes obtener datos (como el perfil del usuario) antes de que se renderice la página.
export default async function Dashboard() {
  return (
    <main className="min-h-screen p-8 pb-24">
      <section className="max-w-xl mx-auto space-y-8">
        <ButtonAccount />
        <h1 className="text-3xl md:text-4xl font-extrabold">Private Page</h1>
      </section>
    </main>
  );
}
