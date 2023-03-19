<script>
  import GetList from "../component/GetList.svelte";
</script>

<main>
  <h1
    class="text-center"
    style="padding-top: 15vh; font-weight: 700; color: #D7B642; font-size: 50pt"
  >
    Gold
  </h1>
  <div
    class="justify-content-between text-center d-flex col-11 mx-auto mt-5 names"
  >
    <GetList level="3" />
  </div>

  <h1
    class="text-center"
    style="padding-top: 15vh; font-weight: 700; color: #667581; font-size: 50pt"
  >
    Silver
  </h1>
  <div
    class="justify-content-between text-center d-flex col-11 mx-auto mt-5 names"
  >
    <GetList level="2" />
  </div>

  <h1
    class="text-center"
    style="padding-top: 15vh; font-weight: 700; color: #C07825; font-size: 50pt"
  >
    Bronze
  </h1>
  <div
    class="justify-content-between text-center d-flex col-11 mx-auto mt-5 names"
  >
    <GetList level="1" />
  </div>
</main>
