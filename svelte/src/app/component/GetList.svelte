<script>
  export let level;
  let promise = getList();

  async function loadList() {
    promise = await getList();
  }

  async function getList() {
    const res = await fetch(`api/v1/donator/${level}`);
    const text = await res.json();

    if (res.ok) {
      return text;
    } else {
      throw text;
    }
  }

  async function deleteDonator(id) {
    const res = await fetch(`api/v1/donator/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) throw await res.json();
  }
</script>

{#await promise}
  <div class="spinner-border mt-3" role="status" />
{:then response}
  {#each response as element}
    <div class="p-2 text-left" style="height: 30vh">
      {element.name}
    </div>
  {/each}
{:catch error}
  <small class="form-text text-danger">{error.message}</small>
{/await}
