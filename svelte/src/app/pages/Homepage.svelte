<script context="module">
  import Form from "../component/Form.svelte";
  
  let projects = [
    {
      title: "Лаборатория детства",
      desc: "Формирование основ гармоничного развития детей в РС(Я)",
      pic: "children_little.jpg",
      href: "https://xn--80aacejg2b2cib.xn--p1ai/",
    },
    {
      title: "Экосистема развития детской одаренности",
      desc: "Раскрытие и развитие задатков, способностей учащихся начальных классов",
      pic: "school_childrens.jpg",
      href: "https://fondyakutia.ru/vib-2021-2023/sozdanie-uslovij-dlya-razvitiya-detej-shkolnogo-vozrasta/",
    },
    {
      title: "Молодёжь: поддержка и развитие",
      desc: "Формирование условий для опережающего развития потенциала молодежи",
      pic: "younger.jpg",
      href: "https://fondyakutia.ru/vib-2021-2023/molodezh-podderzhka-i-razvitie/",
    },
    {
      title: "Центр компетенций по вопросам городской среды LETO",
      desc: "Сохранение окружающей среды для будущих поколений",
      pic: "leto.jpg",
      href: "https://letoyakutia.ru/",
    },
    {
      title: "Региональный центр выявления и поддержки одареных детей",
      desc: "Создание вдохновляющей среды для развития юных талантов",
      pic: "man.jpg",
      href: "https://lensky-kray.ru/",
    },
    {
      title: "Инновационные центры",
      desc: "Расширение сети инновационных центров развития детей по всей республике",
      pic: "open.jpg",
      href: "https://tpykt.ru/about/",
    },
  ];

  let tasks = [
    {
      pic: "handshaking.jpg",
      task: "<b>НАЛАДИТЬ устойчивую сеть</b> партнерских связей в интересах всестороннего развития подрастающих поколении",
    },
    {
      pic: "mech_lamp.jpg",
      task: "<b>ОБЕСПЕЧИТЬ планомерное строительство</b> знаковых инновационных объектов",
    },
    {
      pic: "love_hands.jpg",
      task: "При создании социальной инфраструктуры <b>ОБЕСПЕЧИТЬ повышение качества и комфорта</b> городской и сельской среды и удовлетворение интересов целевых групп населения",
    },
    {
      pic: "ruble.jpg",
      task: "<b>К 2026 г.</b> кратно (минимум в 2 раза) <b>УВЕЛИЧИТЬ объем пожертвований</b> на реализацию проектов",
    },
    {
      pic: "progress.jpg",
      task: "Значительно <b>ПОВЫСИТЬ устойчивость фонда</b> в длительной перспективе через наращивание активов и создание эндаумент-фонда",
    },
  ];

  export function scrollIntoView({ target }) {
    const el = document.querySelector(target.getAttribute("href"));
    if (!el) return;
    el.scrollIntoView({
      behavior: "smooth",
    });
  }

  let form = {
    name: "",
    email: "",
    phone: "",
    level: 0,
  };

  function setLevel(level) {
    form.level = level;
    console.log(form);
    document.getElementById('form-select').value = level;
  }
</script>

<section class="container-fluid section1 bg-tint" id="section1">
  <div class="mx-auto col-10 h-100">
    <div
      class="mx-auto col-8 h-100 d-flex flex-column justify-content-center align-items-center"
    >
      <h1 class="section-title text-white text-center mb-5">
        Созидаем будущее вместе!
      </h1>
      <a
        class="btn rounded-pill py-3 px-5 text-white"
        style="background-color: #ff7c3b;"
        href="#section5"
        role="button"
        on:click|preventDefault={scrollIntoView}
        >Хочу помочь!
      </a>
    </div>
  </div>
</section>

<section class="container-fluid section2" id="section2">
  <div class="mx-auto col-10 d-flex flex-wrap align-items-center">
    <div
      class="col-12 col-md-5 mb-4 mb-md-0 d-flex flex-column justify-content-center align-items-center"
    >
      <div class="text-wrapper">
        <div class="section-title">О фонде</div>
        <div
          style="width: 100px; height: 6px; background: #212529;"
          class="mt-3 mb-4"
        />
        <div style="font-size: 20px;">
          Решение о создании Целевого фонда будущих поколений Республики Саха
          (Якутия) принято на основании Распоряжения Президента Российской
          Федерации от 12 октября 1992 года и Указа Президента Республики Саха
          (Якутия) от 29 октября 1992 года № 278.
        </div>
      </div>
    </div>
    <img
      src="pictures/fond_picture.jpg"
      class="col-12 col-md-6 offset-md-1"
      alt="foundation logo"
    />
  </div>
</section>

<div class="col-10 mx-auto my-4" style="background: #cbcbcb; height: 1px;" />

<section class="container-fluid section3" id="section3">
  <div class="mx-auto col-10">
    <div class="mx-auto col-8 d-flex justify-content-center align-items-center">
      <p class="section-title text-center">Задачи</p>
    </div>
    <div
      class="container-fluid align-items-center d-inline-flex flex-column mt-4"
    >
      {#each tasks as task}
        <div class="w-100 row align-items-center p-3">
          <img
            class="col-4 col-md-2"
            src="pictures/{task.pic}"
            alt="task picture"
          />
          <div
            class="col-8 col-md-10 align-items-center d-flex task-task"
            style="overflow: auto;"
          >
            <div>{@html task.task}</div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<section class="container-fluid section4" id="section4">
  <div class="mx-auto col-10">
    <div class="mx-auto col-8 d-flex justify-content-center align-items-center">
      <p class="section-title text-center">Действующие Проекты</p>
    </div>
    <div class="container-fluid d-flex flex-wrap">
      {#each projects as project}
        <div class="col-12 col-sm-6 col-md-4 px-2 pb-2 pb-md-3">
          <div
            style="background-image: url(pictures/{project.pic}); padding-bottom: 100%; min-height: auto;"
            class="position-relative project-card rounded"
          >
            <div
              class="position-absolute h-100 p-3 p-md-4 d-flex flex-column justify-content-between"
            >
              <p style="font-weight: 600; padding-right: 60px;">
                {project.title}
              </p>
              <p>{project.desc}</p>
            </div>
            <a class="position-absolute" href={project.href}>
              <span> > </span>
            </a>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<section class="container-fluid section5" id="section5">
  <div class="mx-auto col-10">
    <div class="mx-auto col-8 d-flex justify-content-center align-items-center">
      <p class="section-title text-center">Как помочь фонду?</p>
    </div>

    <div class="text-center mt-3">
      <h5>
        Станьте членом сообщества неравнодушных к будущему Якутии, став
        жертвователем ежегодным членским взносом.
      </h5>
    </div>

    <div class="card-group my-5">
      <div class="card text-center">
        <div class="card-header">
          <div class="card-title text-center" style="font-size: 26pt; color: #C07825; font-weight: 600">
            BRONZE
          </div>
          <div class="text-center"><h1>200₽/мес.</h1></div>
        </div>
        <ul class="list-group list-group-flush">
          <li class="list-group-item">Именное упоминание на странице "Благодарности" на сайте</li>
          <li class="list-group-item">Приглашение на закрытые мероприятия, организованные фондом</li>
          <li class="list-group-item">Отправка регулярных новостей о проделанной работе и достижениях фонда</li>
          <li class="list-group-item">Отправка подарочных открыток и сувениров</li>
        </ul>
        <div class="card-footer mt-auto">
          <a href="#section6" on:click|preventDefault={({ target }) => {setLevel(1); scrollIntoView({ target });}} type="button" class="btn btn-warning rounded-pill">Оформить</a>
        </div>
      </div>
      <div class="card text-center">
        <div class="card-header">
          <div class="card-title text-center" style="font-size: 26pt; color: #667581; font-weight: 600">
            SILVER
          </div>
          <div class="text-center"><h1>1000₽/мес.</h1></div>
        </div>
        <ul class="list-group list-group-flush">
          <li class="list-group-item">Все привилегии, перечисленные в BRONZE</li>
          <li class="list-group-item">Возможность посетить одно из мероприятий, организованных фондом</li>
          <li class="list-group-item">Участие в программе лояльности, которая дает скидки на участие в мероприятиях или на приобретение сувениров</li>
        </ul>
        <div class="card-footer mt-auto">
          <a href="#section6" on:click|preventDefault={({ target }) => {setLevel(2); scrollIntoView({ target });}} type="button" class="btn btn-warning rounded-pill">Оформить</a>
        </div>
      </div>
      <div class="card text-center">
        <div class="card-header">
          <div class="card-title text-center" style="font-size: 26pt; color: #D7B642; font-weight: 600">
            GOLD
          </div>
          <div class="text-center"><h1>5000₽/мес.</h1></div>
        </div>
        <ul class="list-group list-group-flush">
          <li class="list-group-item">Все привилегии, перечисленные в SILVER</li>
          <li class="list-group-item">Возможность посетить несколько мероприятий, организованных фондом</li>
          <li class="list-group-item">Возможность внести предложения по работе фонда и получить ответы от руководства</li>
          <li class="list-group-item">Возможность участвовать в консультациях и вебинарах, проводимых фондом для меценатов</li>
        </ul>
        <div class="card-footer mt-auto">
          <a href="#section6" on:click|preventDefault={({ target }) => {setLevel(3); scrollIntoView({ target });}} type="button" class="btn btn-warning rounded-pill">Оформить</a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="container-fluid section6" id="section6">
  <div class="mx-auto col-10">
    <Form bind:form="{form}"/>
  </div>
</section>
