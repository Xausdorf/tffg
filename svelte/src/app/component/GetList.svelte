<script>
  let promise = getList();

  async function loadList() {
	promise = await getList();
  }

  async function getList() {
    const res = await fetch(`api/v1/donator`);
	const text = await res.json();

	if (res.ok) {
	  return text;
	} else {
	  throw text;
	}
  }

  async function deleteDonator(id) {
	const res = await fetch(`api/v1/donator/${id}`, {
		method: 'DELETE'
	});

	if (!res.ok) 
		throw await res.json();
  }
</script>

{#await promise}
    <div class="spinner-border mt-3" role="status"></div>
{:then response}
	<div class="row row-cols-1 row-cols-md-3 g-4">
		{#each response as element}
		<div class="col">
			<div class="card">
				<div class="card-body">
					<div class="d-flex">
						<h5 class="card-title">{element.name}</h5>
						<button type="button" on:click={() => deleteDonator(element.id).then(loadList)} class="btn-close ms-auto" aria-label="Close"></button>
					</div>
					<p class="card-text">{element.email}</p>
					<p class="card-text">{element.phone}</p>
				</div>
				<div class="card-footer">
					<p class="card-text"><small class="text-muted">joined at {element.joinDate}</small></p>
					<p class="card-text"><small class="text-muted">{element.id}</small></p>
				</div>
			</div>
		</div>
		{/each}
  	</div>
{:catch error}
    <small class="form-text text-danger">{error.message}</small>
{/await}
