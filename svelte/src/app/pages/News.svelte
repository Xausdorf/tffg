<script>
  let promise = getNews();

  async function getNews() {
    const res = await fetch(`api/v1/news`);
	const text = await res.json();

	if (res.ok) {
	  return text;
	} else {
	  throw text;
	}
  }
</script>

{#await promise}
    <div class="spinner-border mt-3" role="status"></div>
{:then response}
	<div class="row row-cols-1 row-cols-md-3 g-4">
		{#each response as element}
		<div class="col">
			<div class="card">
                <img src="{element.imgSrc}" class="card-img-top" alt="news image">
				<div class="card-body">
					<h5 class="card-title">{element.title}</h5>
					<p class="card-text">{element.text}</p>
				</div>
				<div class="card-footer">
					<p class="card-text"><small class="text-muted">published at {element.releaseDate}</small></p>
					<p class="card-text"><small class="text-muted">{element.id}</small></p>
				</div>
			</div>
		</div>
		{/each}
  	</div>
{:catch error}
    <small class="form-text text-danger">{error.message}</small>
{/await}
