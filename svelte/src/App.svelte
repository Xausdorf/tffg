<script>
	import Router from './app/routing/Router.svelte';
	import Navbar from './app/component/Navbar.svelte';
	import Footer from './app/component/Footer.svelte';
</script>

<style>
  .app-shell {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
  }
</style>

<div class="app-shell">
  <Navbar />
  <Router />
  <Footer />
</div>