'use client';

export default function SidebarToggle() {
  const toggle = () => {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;

    const isOpen = !sidebar.classList.contains('-translate-x-full');
    if (isOpen) {
      sidebar.classList.add('-translate-x-full');
      backdrop?.classList.add('hidden');
    } else {
      sidebar.classList.remove('-translate-x-full');
      backdrop?.classList.remove('hidden');
    }
  };

  const closeSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    sidebar?.classList.add('-translate-x-full');
    backdrop?.classList.add('hidden');
  };

  return (
    <>
      <button
        id="sidebar-toggle"
        className="fixed top-3 left-3 z-50 p-2.5 rounded-2xl bg-white border border-border lg:hidden"
        aria-label="Toggle navigation menu"
        onClick={toggle}
      >
        <svg className="w-5 h-5 text-ink" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
      <div
        id="sidebar-backdrop"
        className="fixed inset-0 bg-ink/45 z-30 hidden lg:hidden"
        onClick={closeSidebar}
      />
    </>
  );
}
