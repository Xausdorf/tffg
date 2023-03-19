<script>
  import { scrollIntoView } from "../pages/Homepage.svelte";
  import { blockMain } from '../stores.js';

  let blockMainValue;
  blockMain.subscribe(value => {
    blockMainValue = value;
  })

</script>

<nav
  class="navbar navbar-expand-sm navbar-dark fixed-top"
  style="background-color: #000; padding: 20px 0;"
>
  <div class="container-fluid col-10 mx-auto">
    <a class="navbar-brand" href="#/">
      <img src="pictures/do_for_nation_logo_white.svg" alt="logo" />
    </a>
    <button
      class="navbar-toggler"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#navbarNav"
      aria-controls="navbarNav"
      aria-expanded="false"
      aria-label="Toggle navigation"
    >
      <span class="navbar-toggler-icon" />
    </button>
    <div class="collapse navbar-collapse" id="navbarNav">
      <ul class="navbar-nav ml-auto">
        <li class="nav-item">
          {#if blockMainValue}
            <a
              class="nav-link"
              href="#section2"
              on:click|preventDefault={scrollIntoView}>О фонде</a
            >
          {:else}
            <a class="nav-link" href="#/">О фонде</a>
          {/if}
        </li>
        <li class="nav-item">
          {#if blockMainValue}
          <a
            class="nav-link"
            href="#section4"
            on:click|preventDefault={scrollIntoView}>Проекты</a
          >
          {:else}
            <a class="nav-link" href="#/">Проекты</a>
          {/if}
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#/donators">Меценаты</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#/card">Карта</a>
        </li>
      </ul>
    </div>
  </div>
</nav>
