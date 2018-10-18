function planePos(idx){
    let pos = [
        [-10, 6, 5],
        [16, 1, -13],
        [-12, 0, -6],
        [7, -5, -22],
        [-11, -2, -17],
        [8, 9, -11],
        [-14, 7, -15],
        [9, -3, -2]
    ]
    return pos[idx]
}


function loadIsland(callback){
    let mesh = new THREE.Object3D()

    let loaded = after(4,()=>{
        if(callback) callback( mesh )
    })

    THREE.DRACOLoader.setDecoderPath( 'libs/loaders/draco/' )
    let loader = new THREE.DRACOLoader()

    loader.load( `models/drcs/island.drc`, (geometry)=>{
        let mat = new THREE.MeshLambertMaterial({
            side:2, map: new THREE.TextureLoader().load('images/island.jpg')
        })
        let island = new THREE.Mesh(geometry,mat)
        island.name = 'the-island'
        island.castShadow = true
        island.receiveShadow = true
        mesh.add( island )
        loaded()
    })


    loader.load( `models/drcs/island_trees.drc`, (geometry)=>{
        let mat = new THREE.MeshBasicMaterial({
            color:new THREE.Color(1, 0.870588, 0.490196),
            opacity:0.5, transparent:true
        })
        let trees = new THREE.Mesh(geometry,mat)
        trees.name = 'the-island'
        mesh.add( trees )
        loaded()
    })

    loader.load( `models/drcs/router.drc`, (geometry)=>{
        let mat = new THREE.MeshLambertMaterial({
            side:2, map: new THREE.TextureLoader().load('images/gateway.jpg')
        })
        let router = new THREE.Mesh(geometry,mat)
        router.name = 'the-island'
        router.castShadow = true
        router.receiveShadow = true
        mesh.add( router )
        loaded()
    })


    loader.load( `models/drcs/router_lights.drc`, (geometry)=>{
        let mat = new THREE.MeshBasicMaterial({
            color:new THREE.Color(0.752941, 0.709804, 0.505882),
            opacity:0.5, transparent:true
        })
        let bulbs = new THREE.Mesh(geometry,mat)
        bulbs.name = 'the-island'
        mesh.add( bulbs )
        loaded()
    })
}


// =============================================================================
// =================================================================== PARTICLES
// =============================================================================


class ParticleWall {
    constructor(scene){
        this.amt = 700
        this.area = 150

        this.opac = 0.3
        this.size = 1

        this.tick = 0 // in seconds
        this.time2fade = 5
        this.time2rmv = Infinity

        this.mesh = new THREE.Object3D()
        for (let i = 0; i < this.amt; i++) this.initParticle(true)
        scene.add(this.mesh)

    }
    _ranSpot(){
        return {
            x:Math.random()*this.area - this.area/2,
            y:Math.random()*this.area - this.area/2,
            z:Math.random()*this.area - this.area/2
        }
    }

    _scaleTime(x,time){
        x = x + this.area/2
        return time * (x/this.area)
    }

    _setOpac(p){
        // after initial fade in logic
        // fade in/out when reset position
        let str = this.area/2
        let end = -this.area/2
        let off = this.area/4
        if( p.position.x > str-off){
            p.material.opacity = Math.map(p.position.x,
                str, str-off, 0, this.opac)
        } else if( p.position.x < end+off ){
            p.material.opacity = Math.map(p.position.x,
                end+off, end, this.opac, 0)
        }
    }

    _fadeIn(p){
        this._setOpac(p)

        // initial transition from green to white logic
        if( this.tick < this.time2fade ){
            if(p.scale.x>1){
                let s = p.scale.x - Math.random()*0.5
                p.scale.set(s,s,s)
            }
            if(p.material.color.r < 1) p.material.color.r += Math.random()*0.01
            if(p.material.color.g < 1) p.material.color.g += Math.random()*0.01
            if(p.material.color.b < 1) p.material.color.b += Math.random()*0.01
        } else if( this.tick < this.time2fade+1 ){
            // make sure it has all faded in
            this.mesh.children.forEach(p=>{
                p.scale.set(1,1,1)
                p.material.color.setRGB(1,1,1)
            })
        }
    }

    _loop(p){
        if(this.tick < this.time2rmv ){
            let ran = this._ranSpot()
            p.position.set(this.area/2,ran.y,ran.z)
            this._mvpart(p)
        } else {
            this.mesh.remove(p)
        }
    }

    _mvpart(p){
        let targColor = {r:1,g:1,b:1}
        let targX = -this.area/2
        let speed = (p.position.x==this.area/2) ?
            3000 : this._scaleTime(p.position.x, 3000)
        new TWEEN.Tween(p.position).to({x:targX }, speed)
        .onUpdate(()=>this._fadeIn(p))
        .onComplete(()=>this._loop(p))
        .start()
    }

    initParticle(){
        let self = this
        let ran = this._ranSpot()
        let s = this.size
        let geometry = new THREE.PlaneBufferGeometry(s,s,s)
        let material = new THREE.MeshBasicMaterial({
            transparent:true, opacity:1, side:2, color:'#77d878'
        })
        let particle =  new THREE.Mesh( geometry, material )
        particle.position.set(ran.x,ran.y,ran.z)
        particle.rotation.y = Math.PI/2
        particle.rotation.z = Math.PI/4
        particle.scale.set(20,20,20)
        this.mesh.add( particle )
    }

    fadeIn(){
        this.mesh.children.forEach((particle)=>this._mvpart( particle ))
        this.timer = setInterval(()=>{this.tick++},1000)
    }

    fadeOut(){
        this.time2rmv = 0
    }

}

class ParticleWave {
    constructor(callback){
        this.amt = 20*20
        this.area = 20
        this.space = 3
        this.speed = 1
        this.height = 3
        this.size = 0.5

        this.mesh = new THREE.Object3D()

        this.waveParticles = []
        for (let i = 0; i < this.amt; i++) this._initWaveParticle(i)
        this.emitterParticles = []
        for (let i = 0; i < 40; i++) this._initEmitterParticle(i)

        if(callback) callback(this.mesh)
    }

    _initParticle(){
        let s = this.size

        // let geometry = new THREE.BufferGeometry()
        // let vertices = new Float32Array([-s,0,0,0,s,0,s,0,0,-s,0,0])
        // geometry.addAttribute('position',new THREE.BufferAttribute(vertices,3))
        // let material = new THREE.MeshBasicMaterial({color:'#fff',side:2})
        // let particle = new THREE.Mesh( geometry, material )

        // let geometry = new THREE.BufferGeometry()
        // let vertices = new Float32Array([0,0,0])
        // geometry.addAttribute('position',new THREE.BufferAttribute(vertices,3))
        // let material = new THREE.PointsMaterial({
        //     transparent:true, opacity:0.3
        // })
        // let particle = new THREE.Points( geometry, material )

        let geometry = new THREE.PlaneBufferGeometry(s,s,s)
        let material = new THREE.MeshBasicMaterial({
            transparent:true, opacity:0.3, side:2, color:'#fff'
        })
        let particle =  new THREE.Mesh( geometry, material )
        particle.rotation.y = Math.PI/2
        particle.rotation.z = Math.PI/4

        return particle
    }


    _emit(p){
        p.scale.set(this.size,this.size,this.size)
        p.position.x = 0
        p.position.y = -7.5
        p.position.z = (Math.random()>0.5) ? 1 : -1
        let target = {
            x:Math.random()*10 - 5,
            y:0,
            z:Math.random()*10 - 5
        }
        new TWEEN.Tween(p.position).to(target, 3000)
        .onUpdate(()=>{
            let v = Math.map(p.position.y,-7.5,0,this.size,0)
            p.scale.set(v,v,v)
        })
        .onComplete(()=>this._emit(p)).start()
    }

    _initEmitterParticle(i){
        let self = this
        let particle = this._initParticle()
        // position
        particle.position.y = -7.5
        particle.position.z = (Math.random()>0.5) ? 1 : -1
        setTimeout(()=>this._emit(particle),i*100)
        this.mesh.add( particle )
        this.emitterParticles.push( particle )
    }

    _initWaveParticle(i){
        let self = this
        let particle = this._initParticle()
        // position
        let d = this.area
        let x = Math.floor(i/d) - this.area/2
        let z = i%d - this.area/2
        particle.position.x = particle.userData.initX = x
        particle.position.z = particle.userData.initZ = z
        particle.position.multiplyScalar(this.space)
        particle.rotation.y = Math.PI/2
        // update
        particle.update = function(tick){
            tick = tick * 2
            let x = this.userData.initX
            let z = this.userData.initZ
            let h = self.height
            let a = Math.sin((z+tick)*0.3)
            let b = Math.sin((x+tick)*0.5)
            this.position.y = a*self.height + b*self.height
            let s = (a+1)*self.size + (b+1)*self.size
            this.scale.x = this.scale.y = this.scale.z = s
        }
        this.mesh.add( particle )
        this.waveParticles.push( particle )
    }

    update(tick){
        this.waveParticles.forEach((p)=>{ p.update(tick) })
    }
}

class Spinner {
    constructor(config){
        config = config || {}
        this.speed = { v:1, min:-4, max:4 }
        this.radius = { v:0.01, min:0.01, max:0.05 }
        this.z = { v:-200, min:-200, max:420 }
        this.scale = { v:1, min:1, max:3 }

        this.changeScale = false
        this.firstPass = true

        this.children = []
        this.mesh = new THREE.Object3D()

        this.scale.v = this._ranRange(this.scale)
        let amt = config.count || 10
        for (let i = 0; i < amt; i++) {
            let c = this._createChild()
            this.children.push( c )
            this.mesh.add( c.mesh )
        }
    }

    _ranRange(prop){
        let range = prop.max-prop.min
        return Math.random()*range + prop.min
    }

    update(tick){
        let scaleSpeed = 20
        let zLength = 400
        let fadeOff = 75
        let fos = -zLength+fadeOff // fade out start
        let fie = -fadeOff // fade in end

        let z = -( tick*scaleSpeed % zLength)
        let r = Math.sin(z*this.radius.v) * 25

        if(z > this.prevZ){ // on z reset
            this.firstPass = false
            this.speed.v = this._ranRange(this.speed)
            this.radius.v = this._ranRange(this.radius)
            this.scale.v = this._ranRange(this.scale)
            this.mesh.children.forEach((p)=>{
                p.scale.set(this.scale.v,this.scale.v,this.scale.v)
            })
        }

        this.mesh.children.forEach((p,idx,arr)=>{
            // position
            let i = tick - (idx*((Math.PI*2)/arr.length))
            let x = Math.sin(i*this.speed.v) * r
            let y = Math.cos(i*this.speed.v) * r
            p.position.set( x, y, z )
            // scale
            if( this.changeScale ){
                let s = Math.map(x+y, 0, r*2, 1, 10 )
                p.scale.set(s,s,s)
            }
            // opacity
            if( !this.firstPass ){
                if( p.children.length > 0 ){
                    let m = p.children[0]
                    let w = p.children[1]
                    if(z < fos){ // fade out
                        m.material.opacity = Math.map(z,fos,-zLength,0.75,0)
                        w.material.opacity = Math.map(z,fos,-zLength,1,0)
                    } else if(z > fie){ // fade in
                        m.material.opacity = Math.map(z,0,fie,0,0.75)
                        w.material.opacity = Math.map(z,0,fie,0,1)
                    }
                } else {
                    if(z < fos) p.material.opacity = Math.map(z,fos,-zLength,1,0)
                    else if(z > fie) p.material.opacity = Math.map(z,0,fie,0,1)
                }
            }
        })

        this.prevZ = z
    }
}

class ColorParticle {
    constructor(){
        this.white = true

        let geometry = new THREE.PlaneBufferGeometry(1,1,1)
        let material = new THREE.MeshBasicMaterial({
            transparent:true, opacity:0, side:2, color:'#fff'
        })
        this.mesh =  new THREE.Mesh( geometry, material )
        // this.mesh.rotation.y = Math.PI/2
        this.mesh.rotation.z = Math.PI/4
    }

    colorSwap(){
        if(this.white){
            this.mesh.material.color.setHSL(Math.random(),0.75,0.75)
            this.white = false
        } else {
            this.mesh.material.color.setRGB(1,1,1)
            this.white = true
        }
    }
}

class ParticleSpinner extends Spinner {
    constructor(config){
        super(config)
        this.changeScale = true
    }

    _createChild(){
        return new ColorParticle()
    }
}

// =============================================================================
// ====================================================================== CLOUDS
// =============================================================================

class CloudSpinner extends Spinner {
    constructor(config){
        super(config)
    }

    _createChild(){
        return new Cloud({
            radius:this.scale.v,
            cloudOpacity:0,
            wireframeOpacity:0
        })
    }
}

class Cloud {
    constructor(config){
        config = config || {}
        this.mesh = new THREE.Object3D()

        this.radius = config.radius || 1
        this.opacity = (typeof config.cloudOpacity !== "undefined") ?
            config.cloudOpacity : 0.75
        this.wireOpac = (typeof config.wireframeOpacity !== "undefined") ?
            config.wireframeOpacity : 1

        this.points = []
        this.count = Math.floor( Math.random()*25 + 50 )
        for (let i = 0; i < this.count; i++) {
            let point = new THREE.Vector3(
                ( Math.random() - 0.5 ) * 2 * this.radius,
                ( Math.random() - 0.5 ) * 2 * this.radius,
                ( Math.random() - 0.5 ) * 2 * this.radius
            )
            this.points.push( point )
        }
        this._createMesh(config.stretch)
    }

    _convexBufferGeometry( points ){
        let geo = new THREE.BufferGeometry()
        // buffers
        let vz = [] // vertices
        let nz = [] // normals

        // execute QuickHull
        let quickHull = new THREE.QuickHull().setFromPoints( points )

        // generate vertices and normals
        let faces = quickHull.faces
        for(let i = 0; i < faces.length; i++){
            let face = faces[ i ]
            let edge = face.edge
            // we move along a doubly-connected edge list to access all
            // face points (see HalfEdge docs)
            do {
                let point = edge.head().point
                vz.push( point.x, point.y, point.z )
                nz.push( face.normal.x, face.normal.y, face.normal.z )
                edge = edge.next
            } while ( edge !== face.edge )
        }

        // generate colors
        let colors = []
        // // ranbow-gradients
        // for(let i = 0; i < vz.length; i++) colors.push( Math.random() )
        // // grey-gradients
        // for(let i = 0; i < vz.length; i+=3){
        //     let ran = Math.random()
        //     for (let j = 0; j < 3; j++) colors.push( ran )
        // }
        // // greys
        // for(let i = 0; i < vz.length; i+=9){
        //     let ran = Math.random()
        //     for (let j = 0; j < 9; j++) colors.push( ran )
        // }
        // white
        for(let i = 0; i < vz.length; i++) colors.push( 1 )


        // build geometry
        geo.addAttribute('position', new THREE.Float32BufferAttribute(vz,3) )
        geo.addAttribute('normal', new THREE.Float32BufferAttribute(nz,3) )
        geo.toNonIndexed()
        geo.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) )
        return geo
    }

    _createMesh(stretch){
        let geometry = this._convexBufferGeometry( this.points )
        let material = new THREE.MeshBasicMaterial({
            transparent:true, opacity:this.opacity, side:2,
            vertexColors: THREE.VertexColors,
        })
        let mass = new THREE.Mesh( geometry, material )

        let wireframe = new THREE.WireframeGeometry( geometry )
        let wires = new THREE.LineSegments( wireframe )
        wires.material.transparent = true
        wires.material.opacity = this.wireOpac
        wires.material.linewidth = 2
        wires.material.color = new THREE.Color(1,1,1)

        if(stretch){
             mass.scale.set(1.5,1,2)
             wires.scale.set(1.5,1,2)
        }
        this.mesh.add( mass )
        this.mesh.add( wires )
    }

    whiteOut(){
        let ma = this.mesh.children[0].geometry.attributes.color.array
        for (let i = 0; i < ma.length; i++) ma[i] = 1
        this.mesh.children[0].geometry.attributes.color.needsUpdate = true
    }

    greyScale(chances,gradient){
        chances = chances || 1
        let ma = this.mesh.children[0].geometry.attributes.color.array
        if(gradient){
            for (let i = 0; i < ma.length; i+=3){
                if(Math.random()<chances){
                    let ran = Math.random()
                    ma[i] = ran
                    ma[i+1] = ran
                    ma[i+2] = ran
                }
            }
        } else {
            for (let i = 0; i < ma.length; i+=9){
                if(Math.random()<chances){
                    let ran = Math.random()
                    for (let j = 0; j < 9; j++) ma[i+j] = ran
                }
            }
        }
        this.mesh.children[0].geometry.attributes.color.needsUpdate = true
    }

    colorize(chances,gradient){
        chances = chances || 1
        let ma = this.mesh.children[0].geometry.attributes.color.array
        if(gradient){
            for (let i = 0; i < ma.length; i++){
                if(Math.random()<chances) ma[i] = Math.random()
            }
        } else {
            for (let i = 0; i < ma.length; i+=9){
                let r = Math.random()
                let g = Math.random()
                let b = Math.random()
                if(Math.random()<chances){
                    for (let j = 0; j < 9; j++){
                        if(j%3==0) ma[i+j] = r
                        if(j%3==1) ma[i+j] = g
                        if(j%3==2) ma[i+j] = b
                    }
                }
            }
        }
        this.mesh.children[0].geometry.attributes.color.needsUpdate = true
    }
}

function passingCloud(callback){

    let cloud = new Cloud({
        radius:Math.random()*5+1,
        stretch:true
    })

    cloud.mesh.position.x = Math.random()*200-100
    cloud.mesh.position.y = Math.random()*200-100
    cloud.mesh.position.z = Math.random()*400-200
    cloud.keepPassing = true

    function move(time){
        let zLength = 400
        let fadeOff = 75
        let start = zLength/2
        let end = -start
        new TWEEN.Tween(cloud.mesh.position).to({z:end}, time)
        .onUpdate(()=>{
            let z = cloud.mesh.position.z
            let m = cloud.mesh.children[0]
            let w = cloud.mesh.children[1]
            if(z < end+fadeOff){ // fade out
                m.material.opacity = Math.map(z,end+fadeOff,end,0.75,0)
                w.material.opacity = Math.map(z,end+fadeOff,end,1,0)
            } else if(z > start-fadeOff){ // fade in
                m.material.opacity = Math.map(z,start,start-fadeOff,0,0.75)
                w.material.opacity = Math.map(z,start,start-fadeOff,0,1)
            }
        })
        .onComplete(()=>{
            if(cloud.keepPassing){
                cloud.mesh.position.z = start
                move(20000)
            }
        })
        .start()
    }

    callback(cloud,move)
}


function createRandomClouds(){
    let clouds = new THREE.Object3D()
    let cloudData = []

    for (let i = 0; i < 15; i++) {
        let cd = { position:[], clouds:[] }

        let cld = new THREE.Object3D()
        let cnt = Math.floor(Math.random()*5)+1
        for (let j = 0; j < cnt; j++) {
            let r = Math.random()*2.5
            let c = new Cloud({radius:r,stretch:true})
            let cx = Math.random()*r*2
            let cy = Math.random()*r*2
            let cz = Math.random()*r*2
            c.mesh.position.set(cx,cy,cz)
            c.mesh.rotation.y = Math.random()
            c.mesh.rotation.x = Math.random()-0.75
            cld.add( c.mesh )
            cd.clouds.push([cx,cy,cz,r])
        }

        let x = Math.random()*80-40
        let y = Math.random()*80-40
        let z = Math.random()*80-40 +10
        cld.position.set(x,y,z)
        clouds.add( cld )

        cd.position = [x,y,z]
        cloudData.push(cd)
    }
    console.log(JSON.stringify(cloudData))
    return clouds
}

function createDataClouds(){
    let clouds = new THREE.Object3D()
    for (let i = 0; i < CloudData.length; i++) {
        let cld = new THREE.Object3D()
        let data = CloudData[i]
        let cnt = data.clouds.length
        for (let j = 0; j < cnt; j++) {
            let d = data.clouds[j]
            let r = d[3]
            let c = new Cloud({radius:r,stretch:true})
            let cx = Math.random()*r*2
            let cy = Math.random()*r*2
            let cz = Math.random()*r*2
            c.mesh.position.set(d[0],d[1],d[2])
            c.mesh.rotation.y = Math.random()
            c.mesh.rotation.x = Math.random()-0.75
            cld.add( c.mesh )
        }
        let p = data.position
        cld.position.set(p[0],p[1],p[2])
        clouds.add( cld )
    }
    return clouds
}

// data for clouds around island, originally generated by createRandomClouds()
const CloudData = [{"position":[27.948469862238156,30.67885632726086,29.695338006472305],"clouds":[[0.26815241091678227,0.03707133041109556,0.49472998835896576,0.3776674839589167],[2.038167185151374,0.5694856986036602,1.7310017750684343,1.6040990096140362],[0.592270637618505,0.7712678531305255,0.06314494948374694,0.8946426372619078]]},{"position":[-5.501670569844244,-24.46301156905749,27.917939012085917],"clouds":[[2.3311499099513835,0.8633185061645996,2.7877129355981927,1.4413708382860153],[2.385868788500841,0.8918465663713823,1.923775910800908,1.2194524620625473],[1.5829410992969852,1.6251998066994455,0.6478754240789762,0.84022983138316]]},{"position":[-3.582314642551985,-6.880820066188676,33.95742302116716],"clouds":[[0.683070182098051,0.5675480320493503,1.347461340787044,0.8981671660630517],[0.2637178727367533,0.2583931339384136,0.001332913099153888,0.18002574486551154]]},{"position":[-26.371231983498653,36.01468637080198,49.29131842018546],"clouds":[[3.079112282058088,3.662485371620336,1.4029526419486908,1.982566190367287],[0.5294804396736184,1.2503418253243803,0.4506340191059577,0.8138225817798841],[0.7786067729910668,0.6216331319170681,1.422739954389984,1.7401422104057105],[0.23760466724635193,0.20850342295629784,0.2463177774687478,0.13992434008089555],[0.06012842098173799,0.21585717776004032,0.4312874457325655,0.6299666215523578]]},{"position":[18.41419229995067,8.010985761824436,38.97126698094084],"clouds":[[1.0473597368829748,1.6641599087970538,3.224905567954497,1.8006070677126451],[1.0916795766139453,0.5337880596093091,1.1259931154269447,0.5976884730064238],[0.3210377548695266,0.34484429579893877,0.05983664154834748,0.41499890067345113],[0.7141575961633374,0.6825373487860079,0.1771178971718448,0.37985792753425174],[0.8034070234065205,1.0304879071741078,0.8576300566461793,0.5462951274127231]]},{"position":[0.8147405768360017,21.331392829615382,-28.41131015202351],"clouds":[[1.0038942982918908,1.6208610378164674,3.170123942524856,1.8856042431199698],[0.4046934974347496,0.3390059445916188,0.13532142066120392,0.7499304781476285],[0.28362117880002574,0.035937898112344255,1.432224167420992,0.9182666220916413],[0.9518009478439101,1.0143145294250764,0.4376081092304358,0.7937312464850527]]},{"position":[-3.237496215190646,-10.534995129554279,29.213286133351062],"clouds":[[0.039324056652396355,0.0954870820747202,0.3142138014401771,0.17770241929702113],[1.0199310493935065,1.03482349423179,1.8662311553117459,1.321147937240311],[1.149786324833037,2.2960423477901926,1.153834128578211,2.087947559174556],[2.4018329520399924,0.6547152948872513,0.9507529503488125,1.6830445360605382],[0.5404081607877897,0.38924924515444465,2.4995329418411827,2.324954590236032]]},{"position":[18.992558676998065,27.86008948908099,-10.045630402231616],"clouds":[[0.17375987366228726,1.5553925645946152,1.4747376606436744,0.9212171522273804],[0.1267613196115449,0.21149236258096554,0.2449638925635924,0.3084008954994946],[1.7750179832399346,1.3899280309925386,1.232622325167244,0.8960940113000184],[2.374059214584329,2.1619556615223985,1.5917218058359377,1.189147713422728]]},{"position":[-37.989203154200666,-12.358732029248038,-16.808142736334872],"clouds":[[0.5505436392995552,1.1604817387641846,0.5879393379563895,1.1948768898304452],[1.5418652374154183,0.15416924136661164,1.1707673953385294,0.8067757349302249],[0.7471425874419949,0.07489124996699882,0.7492839439548591,0.37689472388852313]]},{"position":[-8.549869145122866,35.47569562204376,-1.4259613895413636],"clouds":[[3.174498083873598,0.9916286797358801,0.8202181762101097,2.2773531030804945],[0.4018639616023812,1.1978674886907763,0.09775041627683546,2.056106365008515],[0.18879960655154449,0.7582178174227238,0.3170486923761019,0.5038299073281438],[0.6658341813074302,1.2834006605851684,0.24103598054463143,0.6760196394961135]]},{"position":[33.22058332081964,-28.51247691275482,-2.5191775928405136],"clouds":[[4.004277878572677,0.13286656647755798,4.657736353867075,2.358468747836919],[1.3313556132196573,1.0630877105217658,0.26393206139631586,0.6779330468016975],[2.7929238966558683,1.1358959809615985,1.2895704650374546,2.214908965185395],[0.036252588052038605,0.17797570858275139,0.15733949228250876,0.2566132210079086]]},{"position":[35.279778224839774,-11.574736267136593,-7.822419731296655],"clouds":[[2.248213120907987,4.373278588986869,0.2870969303241578,2.288308316688243],[2.0866068322966522,2.25304178871233,3.124484129562636,2.2332013920643217],[0.25321821258973287,0.11983311310587133,0.8258002645571106,0.5430182651529958]]},{"position":[25.3771523119495,38.33686283884816,41.93274124066508],"clouds":[[0.5219799281025972,0.2489899012809618,1.4297013070333429,1.1295606956688389]]},{"position":[24.066713836855996,-19.27727985162477,-5.221289607211091],"clouds":[[0.19556593008021303,0.0978397719236338,1.6588081313405005,1.3452926477241571]]},{"position":[38.958990569360154,-2.8374580098039033,27.60771694555463],"clouds":[[0.5422792873859815,1.6636787393596333,2.3274665194540187,1.8083972412104075],[0.04042043732221039,0.9876786451694178,2.30325729376331,1.7170351493323563]]}]
