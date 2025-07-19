import { Hono } from "hono";
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { verify } from "hono/jwt";
import { createBlogInput, updateBlogInput } from "@chetanbava11/medium-common";


export const blogRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string;
        JWT_SECRET: string;
    },
    Variables: {
        userId: string;
    }
}>();

//Middleware to verify the user;
blogRouter.use('/*', async(c, next) => {
    const authHeader = c.req.header("Authorization") || "";
    const user = await verify(authHeader, c.env.JWT_SECRET) as {id: string};

    if(user){
        c.set("userId", user.id);
        await next();
    }else{
        c.status(403);
        return c.json({
            message: "Please logged in!"
        });
    }

});

//Create the new blog
blogRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { success } = createBlogInput.safeParse(body);

    if(!success){
        c.status(411);
        return c.json({
            message: "Incorrect Inputs"
        });
    }
    const authorId = c.get("userId");

    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const blog = await prisma.blog.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: Number(authorId), // Make sure this is a valid number
      },
    });

    return c.json({ id: blog.id });
  } catch (e) {
    console.error("Create Blog Error:", e);
    c.status(500);
    return c.json({ message: "Internal Server Error" });
  }
});


//update the blog
blogRouter.put('/update', async(c) => {
    const body = await c.req.json();

    const { success } = updateBlogInput.safeParse(body);

    if(!success){
        c.status(411);
        return c.json({
            message: "Incorrect Inputs"
        });
    }

     const prisma = new PrismaClient({
	datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());

    const blog = await prisma.blog.update({
        where: {
            id: body.id
        },
        data: {
            title: body.title,
            content: body.content
        }
    });

    return c.json({
        id: blog.id
    });
})

//get the specific blog
blogRouter.get('/get/:id', async(c) => {
    const id = c.req.param("id");
    const prisma = new PrismaClient({
	datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());

   try{
     const blog = await prisma.blog.findFirst({
        where: {
            id: Number(id)
        },
        select: {
            id: true,
            title: true,
            content: true,
            author: {
                select: {
                    name: true
                }
            }
        }
    });

    return c.json({
        blog
    });
   }catch (e){
    c.status(403);
    return c.json({
        message: "Error while fetching blog post!"
    })
   }
})

//pagination - should add 
blogRouter.get('/bulk', async(c) => {
    const prisma = new PrismaClient({
	datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());
    
    const blogs = await prisma.blog.findMany({
        select: {
            content: true,
            title: true,
            id: true,
            author: {
                select: {
                    name: true
                }
            }
        }
    });

    return c.json({
        blogs
    })
});