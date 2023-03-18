<script>
    let form = {};

    async function submitForm() {
        const res = await fetch(`api/v1/donator`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(form)
        });
        if (!res.ok)
            throw await res.json();
    }

    let promise;
    let show = false;

    function submit() {
        show = true;
        promise = submitForm();
    }
</script>

<form class="content">
  <label>Name</label>
  <input type="text" bind:value={form.name} />
  <label>E-mail</label>
  <input type="email" bind:value={form.email} />
  <label>Phone</label>
  <input type="tel" bind:value={form.phone} />
  <label>Sum</label>
  <input type="number" bind:value={form.sum} />
  <button on:click={submit}>submit</button>
</form>

{#if show}
    {#await promise}
        <p>...waiting</p>
    {:then}
        <p>sent successfully</p>
    {:catch error}
        <p style="color: red">{error.message}</p>
    {/await}
{/if}