<script>
  let promise = getList();

  async function getList() {
    const res = await fetch(`api/v1/donator`);
		const text = await res.json();

		if (res.ok) {
			return text;
		} else {
			throw new Error(text);
		} 
  }
</script>

{#await promise}
	<p>...waiting</p>
{:then response}
	{#each response as element}
	  <p>{element.id}</p>
	  <p>{element.email}</p>
	  <p>{element.phone}</p>
	  <p>{element.name}</p>
	  <p>{element.joinDate}</p>
	{/each}
{:catch error}
	<p style="color: red">{error.message}</p>
{/await}
