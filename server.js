import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4'
import { readFile } from 'node:fs/promises'
import { GraphQLScalarType } from 'graphql'
import { connectToDb, getDb } from './db.js'

let db;
const app = express();

app.use(express.json());

// db.issues.remove({})

// const issues = [
//     {
//       id: 1, 
//       status: 'Open', 
//       owner: 'Ravan',
//       created: new Date('2016-08-15'), 
//       effort: 5, 
//       completionDate: undefined,
//       title: 'Error in console when clicking Add',
//     },
//     {
//       id: 2, 
//       status: 'Assigned', 
//       owner: 'Eddie',
//       created: new Date('2016-08-16'), 
//       effort: 14, 
//       completionDate: new Date('2016-08-30'),
//       title: 'Missing bottom border on panel',
//     },
//   ];

// db.issues.insertMany(issues)

app.get('/api/issues', (req, res) => {
  issueList()
    .then(issues => {
      const metaData = {"totalCount": issues.length};
      res.json({
          "metaData": metaData,"records": issues
      });
    })
});

app.post('/api/issues', (req, res) => {
    console.log('req.body',req.body);
    const newIssue = req.body;
    issueAdd(null, newIssue)
      .then(savedResult => {
        console.log('res.json', savedResult);
        res.json(savedResult);
      }); 
});

const GraphQlDateTypeResolver = new GraphQLScalarType({
  name: 'GraphQlDateType',
  description: 'A Date type for GraphQl',
  serialize(value){
    return value.toISOString();
  },
  parseValue(value){
    const newDate = new Date(value);
    return isNaN(newDate) ? undefined : newDate
  }
});

const issueList = async () => {
  const issues = await db.collection('issues').find().toArray();
  return issues;
}

const getNextSequence = async () => {
  const issuesCount = await db.collection('issues').find().count();
  return issuesCount + 1;
}

const issueAdd = async (_root, {issue}) => {
  issue.id = await getNextSequence();
  issue.status = 'New';
  issue.created = new Date();
  const result = await db.collection('issues').insertOne(issue);
  const savedResult = await db.collection('issues').findOne({_id: result.insertedId});
  return savedResult;
}

const typeDefs = await readFile('./schema.graphql', 'utf8');
const resolvers = {
  Query: {
    name: () => 'Erick',
    issueList: issueList
  },
  GraphQlDateType: GraphQlDateTypeResolver,
  Mutation: {
    sendName: (_root, {name}) => {
      console.log(_root)
      return name + '!';
    },
    issueAdd: issueAdd
  }
}

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers
});

await apolloServer.start();

app.use('/graphql', expressMiddleware(apolloServer));

connectToDb((url, err) => {
  if (!err) {
    app.listen(5001, () => {
        console.log('Server started on port 5001');
        console.log('Graphql server started on http://localhost:5001/graphql');
        console.log('MongoDb started on url', url);
    });
    db = getDb();
  }
});
